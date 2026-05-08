const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { z } = require("zod");
const { pool } = require("../db");
const { authenticate } = require("../middleware/auth");
const { logger } = require("../logger");
const { createAuditLog } = require("../services/audit");
const { config } = require("../config");
const { getSystemSettings } = require("../services/systemSettings");
const {
  canUserAccessPanel,
  canUserFilterByUser,
  canUserExportReports,
  canUserCreateEvent,
  canUserEditAnyEvent,
  canUserEditEvent,
  canUserDeleteAnyEvent,
  getBitacoraViewScope,
  canUserViewBitacoras,
  canUserViewBitacora,
  canUserUploadEventAttachment,
  canUserViewEventAttachments,
  canUserViewFile,
  canUserEditFile,
  canUserDeleteFile,
  getSessionCapabilities,
  canUserViewTasks,
  getTaskViewScope,
  buildEventPermissions
} = require("../services/authorization");
const { publishRealtimeEvent } = require("../services/realtime");
const {
  runDetached,
  notifyBitacoraCreated,
  notifyBitacoraUpdated,
  notifyBitacoraCorrelationCreated
} = require("../services/telegramNotifier");
const {
  EventCorrelationError,
  RELATION_TYPES,
  createEventCorrelation,
  deleteEventCorrelation,
  listEventCorrelations,
  searchCorrelatableEvents
} = require("../services/eventCorrelations");
const {
  buildGroupScopeCondition,
  canUserCreateInGroup,
  canUserDeleteGroupResource,
  resolveTargetGroupIdForCreate
} = require("../services/groups");

const router = express.Router();

const createEventSchema = z.object({
  fecha: z.string().date(),
  descripcionActividad: z.string().min(3).max(3000),
  observacion: z.string().min(3).max(3000),
  prioridad: z.enum(["baja", "media", "alta", "observacion"]).default("media"),
  templateId: z.coerce.number().int().positive().optional(),
  groupId: z.coerce.number().int().positive().optional()
});

const updateEventSchema = z
  .object({
    fecha: z.string().date().optional(),
    descripcionActividad: z.string().min(3).max(3000).optional(),
    observacion: z.string().min(3).max(3000).optional(),
  prioridad: z.enum(["baja", "media", "alta", "observacion"]).optional(),
    templateId: z.number().int().positive().nullable().optional(),
    groupId: z.coerce.number().int().positive().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "at_least_one_field_required"
  });

const reportQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  q: z.string().trim().max(200).optional(),
  priority: z.enum(["baja", "media", "alta", "observacion"]).optional(),
  encargadoId: z.coerce.number().int().positive().optional(),
  groupId: z.coerce.number().int().positive().optional(),
  sortBy: z
    .enum(["fecha", "createdAt", "updatedAt", "prioridad", "encargado", "actividad"])
    .default("fecha"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20)
});

const exportQuerySchema = reportQuerySchema.extend({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv")
});
const exportPdfBrandingSchema = z.object({
  companyName: z.string().trim().min(2).max(120).optional(),
  documentTitle: z.string().trim().min(3).max(120).optional(),
  logoDataUrl: z.string().trim().max(900000).optional()
});
const exportBodySchema = exportQuerySchema.extend(exportPdfBrandingSchema.shape);

const trendsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  groupId: z.coerce.number().int().positive().optional()
});
const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30)
});

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function getRuntimeSystemSettings() {
  const current = getSystemSettings();

  const reportPageSizeMax = clampNumber(current?.pagination?.reportPageSizeMax, 10, 500, 200);
  const reportPageSizeDefault = clampNumber(
    current?.pagination?.reportPageSizeDefault,
    5,
    reportPageSizeMax,
    20
  );
  const dashboardEventsDays = clampNumber(current?.dashboard?.eventsDays, 7, 90, 30);

  return {
    pagination: {
      reportPageSizeDefault,
      reportPageSizeMax
    },
    dashboard: {
      eventsDays: dashboardEventsDays
    },
    features: {
      reportExportsEnabled: Boolean(current?.features?.reportExportsEnabled ?? true)
    }
  };
}

function canViewEventsReportModule(user) {
  return canUserViewBitacoras(user);
}

const attachmentParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const eventParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const relationTypeSchema = z.enum(RELATION_TYPES);

const eventCorrelationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  correlationId: z.coerce.number().int().positive().optional()
});

const createEventCorrelationSchema = z
  .object({
    targetEventId: z.coerce.number().int().positive(),
    relationType: relationTypeSchema.default("relacionado"),
    note: z.string().trim().max(500).optional().default("")
  })
  .strict();

const correlationSearchQuerySchema = z.object({
  q: z.string().trim().max(180).optional().default(""),
  sourceEventId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10)
});

const attachmentDownloadSchema = z.object({
  attachmentId: z.coerce.number().int().positive()
});

const attachmentRepositoryQuerySchema = z.object({
  q: z.string().trim().max(180).optional(),
  mimeType: z.string().trim().max(160).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  groupId: z.coerce.number().int().positive().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(20)
});

const updateAttachmentSchema = z
  .object({
    originalName: z.string().trim().min(1).max(180)
  })
  .strict();

const uploadReady = fs.mkdir(config.uploadDir, { recursive: true });
const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel"
]);
const allowedExtensionsByMime = Object.freeze({
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt", ".csv"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"]
});
const minimumMagicBytesByMime = Object.freeze({
  "image/png": 8,
  "image/jpeg": 3,
  "image/webp": 12,
  "image/gif": 6,
  "application/pdf": 5,
  "text/plain": 64,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 4,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 4,
  "application/msword": 8,
  "application/vnd.ms-excel": 8
});
const uploadStorageErrorCodes = new Set([
  "EACCES",
  "EPERM",
  "EROFS",
  "ENOSPC",
  "ENOENT",
  "ENOTDIR",
  "EISDIR",
  "EMFILE",
  "ENFILE"
]);
const uploadStorageMessagePattern =
  /(no space left on device|read-only file system|permission denied|eacces|eperm|erofs|enospc|enoent|enotdir|eisdir|emfile|enfile)/i;
const previewableMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain"
]);

function sanitizeOriginalFileName(originalName) {
  const withoutControlChars = Array.from(path.basename(String(originalName || "")).normalize("NFKC"))
    .filter((char) => {
      const codePoint = char.codePointAt(0);
      return Number.isInteger(codePoint) && codePoint >= 32 && codePoint !== 127;
    })
    .join("");

  const cleaned = withoutControlChars
    .replace(/[^a-zA-Z0-9._()\- ]/g, "_")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return null;
  }

  if (cleaned.length > 180) {
    return null;
  }

  return cleaned;
}

function hasAllowedExtensionForMime(fileName, mimeType) {
  const allowedExtensions = allowedExtensionsByMime[mimeType];
  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return false;
  }
  const extension = path.extname(String(fileName || "")).toLowerCase();
  return allowedExtensions.includes(extension);
}

function startsWithBytes(buffer, signature) {
  if (!Buffer.isBuffer(buffer) || !Buffer.isBuffer(signature)) {
    return false;
  }
  if (buffer.length < signature.length) {
    return false;
  }
  for (let index = 0; index < signature.length; index += 1) {
    if (buffer[index] !== signature[index]) {
      return false;
    }
  }
  return true;
}

function isZipHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false;
  }
  return (
    startsWithBytes(buffer, Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    startsWithBytes(buffer, Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    startsWithBytes(buffer, Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  );
}

function isLegacyOfficeOleHeader(buffer) {
  return startsWithBytes(buffer, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
}

function isLikelyPlainText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return false;
  }

  let suspicious = 0;
  for (const byte of buffer.values()) {
    if (byte === 0x00) {
      return false;
    }

    const isWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d;
    const isPrintable = byte >= 0x20 && byte <= 0x7e;
    const isExtendedUtf8Lead = byte >= 0xc2;

    if (!isWhitespace && !isPrintable && !isExtendedUtf8Lead) {
      suspicious += 1;
    }
  }

  return suspicious / buffer.length < 0.1;
}

async function validateUploadedFileMagic(filePath, mimeType) {
  const requiredBytes = minimumMagicBytesByMime[mimeType];
  if (!requiredBytes) {
    return false;
  }

  const readBytes = Math.max(requiredBytes, 64);
  let handle = null;
  try {
    handle = await fs.open(filePath, "r");
    const header = Buffer.alloc(readBytes);
    const { bytesRead } = await handle.read(header, 0, readBytes, 0);
    const buffer = header.subarray(0, bytesRead);

    if (buffer.length < requiredBytes) {
      return false;
    }

    switch (mimeType) {
      case "image/png":
        return startsWithBytes(buffer, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case "image/jpeg":
        return startsWithBytes(buffer, Buffer.from([0xff, 0xd8, 0xff]));
      case "image/webp":
        return startsWithBytes(buffer, Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"));
      case "image/gif":
        return buffer.subarray(0, 6).equals(Buffer.from("GIF87a")) || buffer.subarray(0, 6).equals(Buffer.from("GIF89a"));
      case "application/pdf":
        return startsWithBytes(buffer, Buffer.from("%PDF-"));
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return isZipHeader(buffer);
      case "application/msword":
      case "application/vnd.ms-excel":
        return isLegacyOfficeOleHeader(buffer);
      case "text/plain":
        return isLikelyPlainText(buffer);
      default:
        return false;
    }
  } catch (error) {
    logger.warn({ err: error, mimeType }, "No se pudo validar magic bytes de adjunto");
    return false;
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch (_error) {
        // No-op
      }
    }
  }
}

function resolveStoredAttachmentPath(storedName) {
  const normalizedStoredName = path.basename(String(storedName || ""));
  if (!normalizedStoredName || normalizedStoredName !== String(storedName || "")) {
    return null;
  }

  const uploadsRoot = path.resolve(config.uploadDir);
  const filePath = path.resolve(uploadsRoot, normalizedStoredName);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

async function removeStoredFiles(storedNames) {
  const uniqueNames = Array.from(
    new Set((Array.isArray(storedNames) ? storedNames : []).map((value) => String(value || "").trim()))
  ).filter(Boolean);

  for (const storedName of uniqueNames) {
    const filePath = resolveStoredAttachmentPath(storedName);
    if (!filePath) {
      continue;
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.warn({ err: error, storedName }, "No se pudo eliminar adjunto fisico");
      }
    }
  }
}

function safeDownloadFileName(name, mimeType, attachmentId) {
  const sanitized = sanitizeOriginalFileName(name);
  if (sanitized) {
    return sanitized;
  }

  const defaultExtension = allowedExtensionsByMime[mimeType]?.[0] || ".bin";
  return `adjunto-${attachmentId}${defaultExtension}`;
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await uploadReady;
      cb(null, config.uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).slice(0, 12);
    const safeExtension = /^[a-zA-Z0-9.]+$/.test(extension) ? extension : "";
    cb(null, `${Date.now()}-${crypto.randomBytes(10).toString("hex")}${safeExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploadMaxBytes
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("invalid_file_type"));
      return;
    }

    const safeOriginalName = sanitizeOriginalFileName(file.originalname);
    if (!safeOriginalName) {
      cb(new Error("invalid_file_name"));
      return;
    }

    if (!hasAllowedExtensionForMime(safeOriginalName, file.mimetype)) {
      cb(new Error("invalid_file_extension"));
      return;
    }

    file.originalname = safeOriginalName;
    cb(null, true);
  }
});

function toISODate(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function resolveCurrentISODate() {
  return toISODate(new Date());
}

function isPastDate(dateValue, currentDateIso = toISODate(new Date())) {
  const normalized = String(dateValue || "").slice(0, 10);
  return normalized < currentDateIso;
}

function hasInvertedDateRange(from, to) {
  return String(from || "") > String(to || "");
}

function buildReportFilters(query, user = null, options = {}) {
  const params = [];
  const whereParts = [];
  const groupAction = options.groupAction || "view";

  const fromIndex = params.push(query.from);
  const toIndex = params.push(query.to);
  whereParts.push(`e.fecha BETWEEN $${fromIndex} AND $${toIndex}`);
  if (user) {
    whereParts.push(buildGroupScopeCondition({ alias: "e", user, params, action: groupAction }));
  }

  if (query.groupId) {
    const groupIndex = params.push(query.groupId);
    whereParts.push(`e.group_id = $${groupIndex}`);
  }

  if (query.q) {
    const qIndex = params.push(`%${query.q.toLowerCase()}%`);
    whereParts.push(
      `(LOWER(e.descripcion_actividad) LIKE $${qIndex} OR LOWER(e.observacion) LIKE $${qIndex} OR LOWER(u.name) LIKE $${qIndex})`
    );
  }

  if (query.priority) {
    const priorityIndex = params.push(query.priority);
    whereParts.push(`e.prioridad = $${priorityIndex}`);
  }

  if (query.encargadoId) {
    const encargadoIndex = params.push(query.encargadoId);
    whereParts.push(`e.encargado_id = $${encargadoIndex}`);
  }

  return {
    whereSql: whereParts.join(" AND "),
    params
  };
}

const REPORT_SORT_COLUMNS = Object.freeze({
  fecha: "e.fecha",
  createdAt: "e.created_at",
  updatedAt: "e.updated_at",
  prioridad: "e.prioridad",
  encargado: "u.name",
  actividad: "e.descripcion_actividad"
});

function buildReportOrderBy(query) {
  const sortColumn = REPORT_SORT_COLUMNS[query.sortBy] || REPORT_SORT_COLUMNS.fecha;
  const direction = String(query.sortOrder || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${sortColumn} ${direction}, e.created_at ${direction}, e.id ${direction}`;
}

function getScopedEncargadoId(req, requestedEncargadoId) {
  const scope = getBitacoraViewScope(req.user);
  if (!scope.canViewAny && scope.canViewOwnCreated) {
    const actorId = Number(req.user?.sub || req.user?.id || 0);
    if (Number.isInteger(actorId) && actorId > 0) {
      return actorId;
    }
    return undefined;
  }

  if (!canUserFilterByUser(req.user)) {
    return undefined;
  }

  return requestedEncargadoId || undefined;
}

function normalizeRealtimeActorId(req) {
  const actorId = Number(req?.user?.sub || req?.user?.id || 0);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return null;
  }
  return actorId;
}

function emitBitacoraRealtimeEvent(kind, req, bitacora, extraPayload = {}) {
  const bitacoraId = Number(
    bitacora?.id ?? bitacora?.eventId ?? bitacora?.event_id ?? extraPayload?.eventId ?? 0
  );
  const ownerId = Number(
    bitacora?.encargadoId ?? bitacora?.encargado_id ?? bitacora?.ownerId ?? bitacora?.owner_id ?? 0
  );
  const groupId = Number(bitacora?.groupId ?? bitacora?.group_id ?? bitacora?.eventGroupId ?? 0);
  const safeBitacoraId = Number.isInteger(bitacoraId) && bitacoraId > 0 ? bitacoraId : null;
  const safeOwnerId = Number.isInteger(ownerId) && ownerId > 0 ? ownerId : null;
  const safeGroupId = Number.isInteger(groupId) && groupId > 0 ? groupId : null;

  publishRealtimeEvent({
    kind,
    payload: {
      entity: "bitacora",
      eventId: safeBitacoraId,
      entityId: safeBitacoraId,
      ownerId: safeOwnerId,
      groupId: safeGroupId,
      actorId: normalizeRealtimeActorId(req),
      ...extraPayload
    },
    visibility: (viewer) =>
      canUserViewBitacora(viewer, {
        id: safeBitacoraId,
        encargadoId: safeOwnerId,
        groupId: safeGroupId
      })
  });
}

function emitBitacoraCorrelationRealtimeEvent(kind, req, { correlation, source, target } = {}) {
  const correlationId = Number(correlation?.id || 0) || null;
  const sourceEventId = Number(source?.id || correlation?.sourceEventId || 0) || null;
  const targetEventId = Number(target?.id || correlation?.targetEventId || 0) || null;
  const sourceOwnerId = Number(source?.encargadoId || source?.encargado_id || 0) || null;
  const targetOwnerId = Number(target?.encargadoId || target?.encargado_id || 0) || null;
  const sourceGroupId = Number(source?.groupId || source?.group_id || 0) || null;
  const targetGroupId = Number(target?.groupId || target?.group_id || 0) || null;

  publishRealtimeEvent({
    kind,
    payload: {
      entity: "event_correlation",
      correlationId,
      eventId: sourceEventId,
      entityId: sourceEventId,
      sourceEventId,
      targetEventId,
      relationType: correlation?.relationType || correlation?.relation_type || null,
      actorId: normalizeRealtimeActorId(req)
    },
    visibility: (viewer) =>
      canUserViewBitacora(viewer, {
        id: sourceEventId,
        encargadoId: sourceOwnerId,
        groupId: sourceGroupId
      }) ||
      canUserViewBitacora(viewer, {
        id: targetEventId,
        encargadoId: targetOwnerId,
        groupId: targetGroupId
      })
  });
}

function escapeCsvValue(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsvBuffer(rows) {
  const header = ["Fecha", "Grupo/Area", "Encargado", "Actividad", "Observacion", "Prioridad", "Plantilla"];
  const lines = [header.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.fecha,
        row.groupName || "",
        row.encargado,
        row.descripcionActividad,
        row.observacion,
        row.prioridad,
        row.templateName || ""
      ]
        .map(escapeCsvValue)
        .join(",")
    );
  }

  return Buffer.from(`\uFEFF${lines.join("\n")}`, "utf8");
}

async function buildXlsxBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bitacora";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Reporte");
  worksheet.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Grupo/Area", key: "groupName", width: 22 },
    { header: "Encargado", key: "encargado", width: 22 },
    { header: "Actividad", key: "descripcionActividad", width: 52 },
    { header: "Observacion", key: "observacion", width: 52 },
    { header: "Prioridad", key: "prioridad", width: 12 },
    { header: "Plantilla", key: "templateName", width: 20 }
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      fecha: row.fecha,
      groupName: row.groupName || "",
      encargado: row.encargado,
      descripcionActividad: row.descripcionActividad,
      observacion: row.observacion,
      prioridad: row.prioridad,
      templateName: row.templateName || ""
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function decodeLogoDataUrl(logoDataUrl) {
  if (!logoDataUrl) {
    return null;
  }

  const trimmed = String(logoDataUrl).trim();
  const match = trimmed.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) {
    return null;
  }

  try {
    return Buffer.from(match[2], "base64");
  } catch (_error) {
    return null;
  }
}

async function buildPdfBuffer(rows, query, branding = {}) {
  const logoBuffer = decodeLogoDataUrl(branding.logoDataUrl);
  const companyName = branding.companyName || "Bitacora Operativa";
  const documentTitle = branding.documentTitle || "Reporte de Bitacora";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 36, 34, { fit: [84, 84], align: "left", valign: "top" });
      } catch (_error) {
        // Ignore logo decode/render errors and continue with text header.
      }
    }

    const headerStartX = logoBuffer ? 132 : 36;
    doc
      .fontSize(9)
      .fillColor("#3c4f63")
      .text(companyName, headerStartX, 36, { width: 420, align: "left" });
    doc
      .fontSize(17)
      .fillColor("#162433")
      .text(documentTitle, headerStartX, 51, { width: 420, align: "left" });
    doc
      .fontSize(10)
      .fillColor("#445a71")
      .text(`Rango: ${query.from} a ${query.to} | Registros: ${rows.length}`, headerStartX, 76, {
        width: 420,
        align: "left"
      });

    doc
      .moveTo(36, 116)
      .lineTo(560, 116)
      .lineWidth(1)
      .strokeColor("#d9e4ef")
      .stroke();

    doc.moveDown(2.2);
    doc
      .fontSize(9)
      .fillColor("#4c637b")
      .text("Plantilla corporativa: exportacion automatica", { align: "left" });
    doc.moveDown(0.55);

    rows.forEach((row, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${row.fecha} | ${row.groupName || "-"} | ${row.encargado} | ${row.prioridad.toUpperCase()}`
        );
      doc
        .fontSize(9)
        .fillColor("#222")
        .text(`Actividad: ${String(row.descripcionActividad || "").slice(0, 220)}`);
      doc
        .fontSize(9)
        .fillColor("#444")
        .text(`Observacion: ${String(row.observacion || "").slice(0, 220)}`);
      if (row.templateName) {
        doc.fontSize(9).text(`Plantilla: ${row.templateName}`);
      }
      doc.moveDown(0.45);

      if (doc.y > 760) {
        doc.addPage();
      }
    });

    doc.end();
  });
}

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function collectUploadErrorCodes(error) {
  const pending = [error];
  const visited = new Set();
  const codes = new Set();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const code = String(current.code || current.errno || "").trim().toUpperCase();
    if (code) {
      codes.add(code);
    }

    if (current.cause) {
      pending.push(current.cause);
    }
    if (current.parent) {
      pending.push(current.parent);
    }
    if (current.originalError) {
      pending.push(current.originalError);
    }
    if (Array.isArray(current.storageErrors)) {
      pending.push(...current.storageErrors);
    }
  }

  return codes;
}

function isUploadStorageError(error) {
  const codes = collectUploadErrorCodes(error);
  for (const code of codes.values()) {
    if (uploadStorageErrorCodes.has(code)) {
      return true;
    }
  }

  return uploadStorageMessagePattern.test(String(error?.message || ""));
}

async function getEventById(eventId) {
  const eventResult = await pool.query(
    `
      SELECT
        id,
        fecha,
        descripcion_actividad AS "descripcionActividad",
        observacion,
        prioridad,
        template_id AS "templateId",
        encargado_id AS "encargadoId",
        group_id AS "groupId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM events
      WHERE id = $1
      LIMIT 1
    `,
    [eventId]
  );

  if (eventResult.rowCount === 0) {
    return null;
  }

  return eventResult.rows[0];
}

async function getEventWithOwner(eventId) {
  const event = await getEventById(eventId);
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    encargado_id: event.encargadoId,
    group_id: event.groupId
  };
}

async function getAttachmentById(attachmentId, client = pool) {
  const result = await client.query(
    `
      SELECT
        ea.id,
        ea.event_id AS "eventId",
        ea.uploaded_by AS "uploadedBy",
        ea.owner_id AS "ownerId",
        ea.original_name AS "originalName",
        ea.stored_name AS "storedName",
        ea.mime_type AS "mimeType",
        ea.size_bytes AS "sizeBytes",
        ea.created_at AS "createdAt",
        ea.group_id AS "groupId",
        e.encargado_id AS "encargadoId",
        e.group_id AS "eventGroupId"
      FROM event_attachments ea
      JOIN events e ON e.id = ea.event_id
      WHERE ea.id = $1
      LIMIT 1
    `,
    [attachmentId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function auditAttachmentAccessDenied(req, attachmentId, reason = "forbidden") {
  await createAuditLog({
    userId: req.user?.sub || null,
    action: "attachment.access_denied",
    entity: "event_attachment",
    entityId: attachmentId || null,
    metadata: {
      reason,
      route: req.originalUrl,
      method: req.method
    },
    req
  });
}

function ensureCanEditEventsOrForbidden(req, res, eventOwnerId) {
  if (!canUserEditEvent(req.user, eventOwnerId)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }

  return true;
}

function ensureCanDeleteEventsOrForbidden(req, res) {
  if (!canUserDeleteAnyEvent(req.user)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }

  return true;
}

function ensureEventAttachmentPermissionOrNotFound(
  req,
  res,
  event,
  permission,
  notFoundCode = "event_not_found"
) {
  const isAllowed =
    permission === "upload"
      ? canUserUploadEventAttachment(req.user, event)
      : canUserViewEventAttachments(req.user, event);

  if (!isAllowed) {
    res.status(404).json({ error: notFoundCode });
    return false;
  }

  return true;
}

function sendEventCorrelationError(res, error) {
  if (error instanceof EventCorrelationError) {
    return res.status(error.status).json({ error: error.code, details: error.details || undefined });
  }

  return null;
}

router.post("/", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "registroNuevo") || !canUserCreateEvent(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const payload = createEventSchema.parse(req.body);
    const groupResolution = await resolveTargetGroupIdForCreate(req.user, payload.groupId);
    if (groupResolution.error === "forbidden") {
      return res.status(403).json({ error: "forbidden" });
    }
    if (groupResolution.error) {
      return res.status(400).json({ error: "validation_error" });
    }
    const currentDateIso = resolveCurrentISODate(req);
    if (isPastDate(payload.fecha, currentDateIso)) {
      return res.status(400).json({ error: "past_date_not_allowed" });
    }

    if (payload.templateId) {
      const templateResult = await pool.query(
        "SELECT id, is_active FROM event_templates WHERE id = $1 LIMIT 1",
        [payload.templateId]
      );
      if (templateResult.rowCount === 0) {
        return res.status(404).json({ error: "template_not_found" });
      }
      if (!templateResult.rows[0].is_active) {
        return res.status(400).json({ error: "template_inactive" });
      }
    }

    const result = await pool.query(
      `
        INSERT INTO events (fecha, descripcion_actividad, observacion, prioridad, encargado_id, template_id, group_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          fecha,
          descripcion_actividad AS "descripcionActividad",
          observacion,
          prioridad,
          template_id AS "templateId",
          encargado_id AS "encargadoId",
          group_id AS "groupId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        payload.fecha,
        payload.descripcionActividad,
        payload.observacion,
        payload.prioridad,
        req.user.sub,
        payload.templateId || null,
        groupResolution.groupId
      ]
    );

    const event = result.rows[0];

    await createAuditLog({
      userId: req.user.sub,
      action: "events.created",
      entity: "event",
      entityId: event.id,
      metadata: {
        prioridad: event.prioridad,
        templateId: event.templateId || null
      },
      req
    });

    runDetached(async () => {
      const actorId = Number(req.user?.sub || 0) || null;
      const actorName = req.user?.name || req.user?.email || "Sistema";
      await notifyBitacoraCreated({ event, actorName, actorId });
    }, "telegram.bitacora.created");

    emitBitacoraRealtimeEvent("event.created", req, event);

    return res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/report", authenticate, async (req, res, next) => {
  try {
    if (!canViewEventsReportModule(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = reportQuerySchema.parse(req.query);
    if (hasInvertedDateRange(query.from, query.to)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const settings = getRuntimeSystemSettings();
    const hasRequestedPageSize = Object.prototype.hasOwnProperty.call(req.query || {}, "pageSize");
    const requestedPageSize = hasRequestedPageSize
      ? query.pageSize
      : settings.pagination.reportPageSizeDefault;
    const effectivePageSize = clampNumber(
      requestedPageSize,
      1,
      settings.pagination.reportPageSizeMax,
      settings.pagination.reportPageSizeDefault
    );

    const scopedQuery = {
      ...query,
      pageSize: effectivePageSize,
      encargadoId: getScopedEncargadoId(req, query.encargadoId)
    };
    const { whereSql, params } = buildReportFilters(scopedQuery, req.user);
    const orderBySql = buildReportOrderBy(scopedQuery);

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
      `,
      params
    );

    const totalEvents = Number(countResult.rows[0]?.total || 0);
    const totalPages = totalEvents === 0 ? 1 : Math.ceil(totalEvents / scopedQuery.pageSize);
    const currentPage = Math.min(scopedQuery.page, totalPages);
    const offset = (currentPage - 1) * scopedQuery.pageSize;

    const eventsParams = [...params];
    const limitIndex = eventsParams.push(scopedQuery.pageSize);
    const offsetIndex = eventsParams.push(offset);

    const eventsResult = await pool.query(
      `
        SELECT
          e.id,
          e.fecha,
          e.descripcion_actividad AS "descripcionActividad",
          e.observacion,
          e.prioridad,
          e.created_at AS "createdAt",
          e.updated_at AS "updatedAt",
          e.template_id AS "templateId",
          t.name AS "templateName",
          e.group_id AS "groupId",
          g.name AS "groupName",
          g.slug AS "groupSlug",
          u.id AS "encargadoId",
          CASE
            WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
              THEN CONCAT(u.name, ' (Usuario inactivo)')
            ELSE u.name
          END AS encargado,
          u.email AS "encargadoEmail",
          (
            SELECT COUNT(*)::int
            FROM event_attachments ea
            WHERE ea.event_id = e.id
          ) AS "attachmentsCount"
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        LEFT JOIN event_templates t ON t.id = e.template_id
        LEFT JOIN groups g ON g.id = e.group_id
        WHERE ${whereSql}
        ORDER BY ${orderBySql}
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      eventsParams
    );

    const summaryResult = await pool.query(
      `
        SELECT
          e.fecha,
          COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
        GROUP BY e.fecha
        ORDER BY e.fecha DESC
      `,
      params
    );

    const events = eventsResult.rows.map((event) => ({
      ...event,
      group: event.groupId
        ? { id: Number(event.groupId), name: event.groupName || "", slug: event.groupSlug || "" }
        : null,
      permissions: buildEventPermissions(req.user, event)
    }));

    return res.json({
      from: query.from,
      to: query.to,
      totalEvents,
      byDate: summaryResult.rows,
      events,
      permissions: {
        canFilterByUser: canUserFilterByUser(req.user),
        canEditAnyEvent: canUserEditAnyEvent(req.user),
        canDeleteAnyEvent: canUserDeleteAnyEvent(req.user)
      },
      pagination: {
        page: currentPage,
        pageSize: scopedQuery.pageSize,
        totalPages,
        totalItems: totalEvents
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

async function handleReportExport(req, res, next, source) {
  try {
    if (!canUserAccessPanel(req.user, "informes") || !canUserExportReports(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const settings = getRuntimeSystemSettings();
    if (!settings.features.reportExportsEnabled) {
      return res.status(403).json({ error: "forbidden" });
    }

    const payload = source === "body" ? exportBodySchema.parse(req.body) : exportQuerySchema.parse(req.query);
    if (hasInvertedDateRange(payload.from, payload.to)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const scopedPayload = {
      ...payload,
      encargadoId: getScopedEncargadoId(req, payload.encargadoId)
    };
    const { whereSql, params } = buildReportFilters(scopedPayload, req.user, {
      groupAction: "export"
    });
    const orderBySql = buildReportOrderBy(scopedPayload);

    const eventsResult = await pool.query(
      `
        SELECT
          e.id,
          e.fecha,
          e.descripcion_actividad AS "descripcionActividad",
          e.observacion,
          e.prioridad,
          t.name AS "templateName",
          e.group_id AS "groupId",
          g.name AS "groupName",
          CASE
            WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
              THEN CONCAT(u.name, ' (Usuario inactivo)')
            ELSE u.name
          END AS encargado
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        LEFT JOIN event_templates t ON t.id = e.template_id
        LEFT JOIN groups g ON g.id = e.group_id
        WHERE ${whereSql}
        ORDER BY ${orderBySql}
      `,
      params
    );

    const fileNameBase = `bitacora-${scopedPayload.from}-${scopedPayload.to}`;

    if (payload.format === "csv") {
      const buffer = buildCsvBuffer(eventsResult.rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${fileNameBase}.csv"`);
      return res.send(buffer);
    }

    if (payload.format === "xlsx") {
      const buffer = await buildXlsxBuffer(eventsResult.rows);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${fileNameBase}.xlsx"`);
      return res.send(buffer);
    }

    const branding = source === "body" ? exportPdfBrandingSchema.parse(req.body) : {};
    const pdfBuffer = await buildPdfBuffer(eventsResult.rows, scopedPayload, branding);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameBase}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
}

router.get("/report/export", authenticate, async (req, res, next) =>
  handleReportExport(req, res, next, "query")
);

router.post("/report/export", authenticate, async (req, res, next) =>
  handleReportExport(req, res, next, "body")
);

router.get("/trends", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "tendencias")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = trendsQuerySchema.parse(req.query);
    const settings = getRuntimeSystemSettings();
    const defaultDays = settings.dashboard.eventsDays;
    const to = query.to || toISODate(new Date());
    const from =
      query.from || toISODate(new Date(Date.now() - (defaultDays - 1) * 24 * 60 * 60 * 1000));
    if (hasInvertedDateRange(from, to)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const reportQuery = {
      from,
      to,
      q: undefined,
      priority: undefined,
      groupId: query.groupId,
      encargadoId: getScopedEncargadoId(req, undefined),
      page: 1,
      pageSize: 50
    };

    const { whereSql, params } = buildReportFilters(reportQuery, req.user);

    const byDateResult = await pool.query(
      `
        SELECT e.fecha, COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
        GROUP BY e.fecha
        ORDER BY e.fecha ASC
      `,
      params
    );

    const byPriorityResult = await pool.query(
      `
        SELECT e.prioridad, COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
        GROUP BY e.prioridad
      `,
      params
    );

    const byUserResult = await pool.query(
      `
        SELECT
          CASE
            WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
              THEN CONCAT(u.name, ' (Usuario inactivo)')
            ELSE u.name
          END AS encargado,
          COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
        GROUP BY u.name, u.is_active, u.deleted_at
        ORDER BY total DESC, encargado ASC
        LIMIT 8
      `,
      params
    );

    return res.json({
      from,
      to,
      byDate: byDateResult.rows,
      byPriority: byPriorityResult.rows,
      topEncargados: byUserResult.rows
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "dashboard")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = dashboardQuerySchema.parse(req.query);
    const settings = getRuntimeSystemSettings();
    const hasRequestedDays = Object.prototype.hasOwnProperty.call(req.query || {}, "days");
    const days = hasRequestedDays ? query.days : settings.dashboard.eventsDays;
    const today = toISODate(new Date());
    const from = toISODate(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const scopedEncargadoId = getScopedEncargadoId(req, undefined);
    const hasScope = Number.isInteger(Number(scopedEncargadoId)) && Number(scopedEncargadoId) > 0;
    const buildEventScope = (alias = "e", initialParams = []) => {
      const params = [...initialParams];
      const clauses = [buildGroupScopeCondition({ alias, user: req.user, params, action: "view" })];
      if (hasScope) {
        const ownerIndex = params.push(Number(scopedEncargadoId));
        clauses.push(`${alias}.encargado_id = $${ownerIndex}`);
      }
      return {
        params,
        whereSql: `WHERE ${clauses.join(" AND ")}`
      };
    };
    const totalsScope = buildEventScope("e");

    const totalsResult = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE e.fecha = CURRENT_DATE)::int AS hoy,
          COUNT(*) FILTER (WHERE e.prioridad = 'alta')::int AS alta,
          COUNT(*) FILTER (WHERE e.prioridad = 'media')::int AS media,
          COUNT(*) FILTER (WHERE e.prioridad = 'baja')::int AS baja
        FROM events e
        ${totalsScope.whereSql}
      `,
      totalsScope.params
    );

    const byUserScope = buildEventScope("e", [days]);
    const byUserResult = await pool.query(
      `
        SELECT
          CASE
            WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
              THEN CONCAT(u.name, ' (Usuario inactivo)')
            ELSE u.name
          END AS encargado,
          COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        ${byUserScope.whereSql}
          AND e.fecha >= CURRENT_DATE - ($1::int - 1)
        GROUP BY u.name, u.is_active, u.deleted_at
        ORDER BY total DESC, encargado ASC
        LIMIT 12
      `,
      byUserScope.params
    );

    const byPriorityScope = buildEventScope("e");
    const byPriorityResult = await pool.query(
      `
        SELECT
          e.prioridad,
          COUNT(*)::int AS total
        FROM events e
        ${byPriorityScope.whereSql}
          AND e.prioridad IN ('alta', 'media', 'baja')
        GROUP BY e.prioridad
      `,
      byPriorityScope.params
    );

    const byDateParams = [days];
    const byDateJoinClauses = [
      buildGroupScopeCondition({ alias: "e", user: req.user, params: byDateParams, action: "view" })
    ];
    if (hasScope) {
      const ownerIndex = byDateParams.push(Number(scopedEncargadoId));
      byDateJoinClauses.push(`e.encargado_id = $${ownerIndex}`);
    }
    const byDateResult = await pool.query(
      `
        WITH calendar AS (
          SELECT
            generate_series(
              CURRENT_DATE - ($1::int - 1),
              CURRENT_DATE,
              interval '1 day'
            )::date AS fecha
        )
        SELECT
          to_char(c.fecha, 'YYYY-MM-DD') AS fecha,
          COALESCE(COUNT(e.id), 0)::int AS total
        FROM calendar c
        LEFT JOIN events e ON e.fecha = c.fecha AND ${byDateJoinClauses.join(" AND ")}
        GROUP BY c.fecha
        ORDER BY c.fecha ASC
      `,
      byDateParams
    );

    const actorId = Number(req.user?.sub || req.user?.id || 0);
    const taskViewScope = getTaskViewScope(req.user);
    const canViewTaskScope = canUserViewTasks(req.user);
    const emptyTaskAlerts = {
      tareas_vencidas: 0,
      tareas_criticas: 0,
      tareas_alta: 0,
      tareas_media: 0,
      tareas_baja: 0,
      tareas_pendiente_revision: 0,
      tareas_en_proceso: 0,
      tareas_sin_realizar: 0
    };

    let taskAlertsRow = emptyTaskAlerts;
    if (canViewTaskScope) {
      const taskAlertsParams = [];
      const taskVisibilityClauses = [];
      if (!taskViewScope.canViewAny) {
        if (Number.isInteger(actorId) && actorId > 0) {
          const actorIndex = taskAlertsParams.push(actorId);
          if (taskViewScope.canViewOwnCreated) {
            taskVisibilityClauses.push(`t.created_by = $${actorIndex}`);
          }
          if (taskViewScope.canViewAssigned) {
            taskVisibilityClauses.push(
              `(t.assigned_to = $${actorIndex} OR $${actorIndex} = ANY(t.assignee_ids))`
            );
          }
        }
      }

      const taskAlertsWhere = (() => {
        const baseClauses = [
          "t.deleted_at IS NULL",
          buildGroupScopeCondition({ alias: "t", user: req.user, params: taskAlertsParams, action: "view" })
        ];
        if (!taskViewScope.canViewAny) {
          if (taskVisibilityClauses.length === 0) {
            baseClauses.push("1 = 0");
          } else {
            baseClauses.push(`(${taskVisibilityClauses.join(" OR ")})`);
          }
        }
        return `WHERE ${baseClauses.join(" AND ")}`;
      })();

      const taskAlertsResult = await pool.query(
        `
          SELECT
            COUNT(*) FILTER (
              WHERE t.due_date IS NOT NULL
                AND t.due_date < CURRENT_DATE
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_vencidas,
            COUNT(*) FILTER (
              WHERE t.priority = 'alta'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_criticas,
            COUNT(*) FILTER (
              WHERE t.priority = 'alta'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_alta,
            COUNT(*) FILTER (
              WHERE t.priority = 'media'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_media,
            COUNT(*) FILTER (
              WHERE t.priority = 'baja'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_baja,
            COUNT(*) FILTER (
              WHERE t.status = 'pendiente_revision'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_pendiente_revision,
            COUNT(*) FILTER (
              WHERE t.status = 'en_proceso'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_en_proceso,
            COUNT(*) FILTER (
              WHERE t.status = 'sin_realizar'
                AND t.status NOT IN ('completada', 'cancelada')
            )::int AS tareas_sin_realizar
          FROM tasks t
          ${taskAlertsWhere}
        `,
        taskAlertsParams
      );

      taskAlertsRow = taskAlertsResult.rows[0] || emptyTaskAlerts;
    }

    const criticalScope = buildEventScope("e");
    const criticalEventsResult = await pool.query(
      `
        SELECT COUNT(*)::int AS bitacoras_criticas
        FROM events e
        ${criticalScope.whereSql}
          AND e.prioridad = 'alta'
          AND e.fecha >= CURRENT_DATE - INTERVAL '6 day'
      `,
      criticalScope.params
    );

    const privilegedActivity = ["admin", "supervisor"].includes(String(req.user?.role || ""));
    const activityResult = await pool.query(
      `
        SELECT
          a.id,
          a.action,
          a.entity,
          a.entity_id AS "entityId",
          a.created_at AS "createdAt",
          CASE
            WHEN u.id IS NULL THEN 'Usuario eliminado'
            WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
              THEN CONCAT(u.name, ' (Usuario inactivo)')
            ELSE u.name
          END AS "userName"
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ${privilegedActivity ? "" : "WHERE a.user_id = $1"}
        ORDER BY a.created_at DESC
        LIMIT 8
      `,
      privilegedActivity ? [] : [actorId]
    );

    const eventsAlertRow = criticalEventsResult.rows[0] || {};

    return res.json({
      range: {
        from,
        to: today,
        days
      },
      totals: totalsResult.rows[0] || {
        total: 0,
        hoy: 0,
        alta: 0,
        media: 0,
        baja: 0
      },
      alerts: {
        tareasVencidas: Number(taskAlertsRow.tareas_vencidas || 0),
        tareasCriticas: Number(taskAlertsRow.tareas_criticas || 0),
        tareasAlta: Number(taskAlertsRow.tareas_alta || 0),
        tareasMedia: Number(taskAlertsRow.tareas_media || 0),
        tareasBaja: Number(taskAlertsRow.tareas_baja || 0),
        tareasPendienteRevision: Number(taskAlertsRow.tareas_pendiente_revision || 0),
        tareasEnProceso: Number(taskAlertsRow.tareas_en_proceso || 0),
        tareasSinRealizar: Number(taskAlertsRow.tareas_sin_realizar || 0),
        bitacorasCriticas: Number(eventsAlertRow.bitacoras_criticas || 0)
      },
      recentActivity: activityResult.rows,
      byUser: byUserResult.rows,
      byPriority: byPriorityResult.rows,
      byDate: byDateResult.rows
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/correlations/search", authenticate, async (req, res, next) => {
  try {
    if (!canUserViewBitacoras(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = correlationSearchQuerySchema.parse(req.query);
    const results = await searchCorrelatableEvents({
      user: req.user,
      sourceEventId: query.sourceEventId || null,
      q: query.q,
      limit: query.limit
    });

    return res.json({
      results,
      total: results.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (sendEventCorrelationError(res, error)) {
      return;
    }
    return next(error);
  }
});

router.get("/:id/correlations", authenticate, async (req, res, next) => {
  try {
    if (!canUserViewBitacoras(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = eventCorrelationParamsSchema.parse(req.params);
    const correlations = await listEventCorrelations({
      eventId: params.id,
      user: req.user
    });

    await createAuditLog({
      userId: req.user.sub,
      action: "event.correlation.viewed",
      entity: "event",
      entityId: params.id,
      metadata: {
        total: correlations.all.length
      },
      req
    });

    return res.json(correlations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (sendEventCorrelationError(res, error)) {
      return;
    }
    return next(error);
  }
});

router.post("/:id/correlations", authenticate, async (req, res, next) => {
  try {
    const params = eventCorrelationParamsSchema.parse(req.params);
    const payload = createEventCorrelationSchema.parse(req.body);
    const result = await createEventCorrelation({
      sourceEventId: params.id,
      targetEventId: payload.targetEventId,
      relationType: payload.relationType,
      note: payload.note,
      user: req.user
    });

    await createAuditLog({
      userId: req.user.sub,
      action: "event.correlation.created",
      entity: "event_correlation",
      entityId: result.correlation.id,
      metadata: {
        sourceEventId: result.source.id,
        targetEventId: result.target.id,
        relationType: result.correlation.relationType,
        note: result.correlation.note || ""
      },
      req
    });

    runDetached(async () => {
      const actorId = Number(req.user?.sub || 0) || null;
      const actorName = req.user?.name || req.user?.email || "Sistema";
      await notifyBitacoraCorrelationCreated({
        correlation: result.correlation,
        source: result.source,
        target: result.target,
        actorName,
        actorId
      });
    }, "telegram.bitacora.correlation.created");

    emitBitacoraCorrelationRealtimeEvent("event.correlation.created", req, result);

    return res.status(201).json({
      correlation: result.correlation,
      source: result.source,
      target: result.target
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (sendEventCorrelationError(res, error)) {
      return;
    }
    return next(error);
  }
});

router.delete("/:id/correlations/:correlationId", authenticate, async (req, res, next) => {
  try {
    const params = eventCorrelationParamsSchema.parse(req.params);
    const result = await deleteEventCorrelation({
      eventId: params.id,
      correlationId: params.correlationId,
      user: req.user
    });

    await createAuditLog({
      userId: req.user.sub,
      action: "event.correlation.deleted",
      entity: "event_correlation",
      entityId: result.correlation.id,
      metadata: {
        sourceEventId: result.correlation.sourceEventId,
        targetEventId: result.correlation.targetEventId,
        relationType: result.correlation.relationType,
        note: result.correlation.note || ""
      },
      req
    });

    emitBitacoraCorrelationRealtimeEvent("event.correlation.deleted", req, result);

    return res.json({ message: "Correlacion eliminada correctamente" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (sendEventCorrelationError(res, error)) {
      return;
    }
    return next(error);
  }
});

router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const params = eventParamsSchema.parse(req.params);
    const payload = updateEventSchema.parse(req.body);
    const event = await getEventById(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!ensureCanEditEventsOrForbidden(req, res, event)) {
      return;
    }

    if (payload.groupId !== undefined && !canUserCreateInGroup(req.user, payload.groupId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const currentDateIso = resolveCurrentISODate(req);
    if (payload.fecha && isPastDate(payload.fecha, currentDateIso)) {
      return res.status(400).json({ error: "past_date_not_allowed" });
    }

    if (payload.templateId !== undefined && payload.templateId !== null) {
      const templateResult = await pool.query(
        "SELECT id, is_active FROM event_templates WHERE id = $1 LIMIT 1",
        [payload.templateId]
      );
      if (templateResult.rowCount === 0) {
        return res.status(404).json({ error: "template_not_found" });
      }
      if (!templateResult.rows[0].is_active) {
        return res.status(400).json({ error: "template_inactive" });
      }
    }

    const fields = [];
    const values = [params.id];

    if (payload.fecha !== undefined) {
      values.push(payload.fecha);
      fields.push(`fecha = $${values.length}`);
    }
    if (payload.descripcionActividad !== undefined) {
      values.push(payload.descripcionActividad);
      fields.push(`descripcion_actividad = $${values.length}`);
    }
    if (payload.observacion !== undefined) {
      values.push(payload.observacion);
      fields.push(`observacion = $${values.length}`);
    }
    if (payload.prioridad !== undefined) {
      values.push(payload.prioridad);
      fields.push(`prioridad = $${values.length}`);
    }
    if (payload.templateId !== undefined) {
      values.push(payload.templateId);
      fields.push(`template_id = $${values.length}`);
    }
    if (payload.groupId !== undefined) {
      values.push(payload.groupId);
      fields.push(`group_id = $${values.length}`);
    }

    const updateResult = await pool.query(
      `
        UPDATE events
        SET ${fields.join(", ")}
        WHERE id = $1
        RETURNING
          id,
          fecha,
          descripcion_actividad AS "descripcionActividad",
          observacion,
          prioridad,
          template_id AS "templateId",
          encargado_id AS "encargadoId",
          group_id AS "groupId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      values
    );

    const updatedEvent = updateResult.rows[0];

    await createAuditLog({
      userId: req.user.sub,
      action: "events.updated",
      entity: "event",
      entityId: params.id,
      metadata: {
        before: {
          fecha: event.fecha,
          descripcionActividad: event.descripcionActividad,
          observacion: event.observacion,
          prioridad: event.prioridad,
          templateId: event.templateId
        },
        after: {
          fecha: updatedEvent.fecha,
          descripcionActividad: updatedEvent.descripcionActividad,
          observacion: updatedEvent.observacion,
          prioridad: updatedEvent.prioridad,
          templateId: updatedEvent.templateId
        }
      },
      req
    });

    runDetached(async () => {
      const actorId = Number(req.user?.sub || 0) || null;
      const actorName = req.user?.name || req.user?.email || "Sistema";
      await notifyBitacoraUpdated({ event: updatedEvent, actorName, actorId });
    }, "telegram.bitacora.updated");

    emitBitacoraRealtimeEvent("event.updated", req, updatedEvent, {
      changedFields: fields.map((field) => String(field).split("=")[0].trim())
    });

    return res.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  let client = null;
  let txStarted = false;
  try {
    if (!ensureCanDeleteEventsOrForbidden(req, res)) {
      return;
    }

    const params = eventParamsSchema.parse(req.params);
    const event = await getEventById(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!canUserDeleteGroupResource(req.user, event)) {
      return res.status(403).json({ error: "forbidden" });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    txStarted = true;

    const attachmentsResult = await client.query(
      `
        SELECT stored_name
        FROM event_attachments
        WHERE event_id = $1
      `,
      [params.id]
    );

    const storedNames = attachmentsResult.rows.map((row) => row.stored_name);

    await client.query("DELETE FROM events WHERE id = $1", [params.id]);
    await client.query("COMMIT");
    txStarted = false;

    await removeStoredFiles(storedNames);

    await createAuditLog({
      userId: req.user.sub,
      action: "events.deleted",
      entity: "event",
      entityId: params.id,
      metadata: {
        deleted: {
          fecha: event.fecha,
          descripcionActividad: event.descripcionActividad,
          observacion: event.observacion,
          prioridad: event.prioridad,
          templateId: event.templateId,
          encargadoId: event.encargadoId
        }
      },
      req
    });

    emitBitacoraRealtimeEvent("event.deleted", req, event);

    return res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    if (client && txStarted) {
      await client.query("ROLLBACK");
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  } finally {
    if (client) {
      client.release();
    }
  }
});

router.post("/:id/attachments", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentParamsSchema.parse(req.params);
    const event = await getEventWithOwner(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!ensureEventAttachmentPermissionOrNotFound(req, res, event, "upload")) {
      return;
    }

    await runUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: "file_required" });
    }

    const magicValid = await validateUploadedFileMagic(req.file.path, req.file.mimetype);
    if (!magicValid) {
      await removeStoredFiles([req.file.filename]);
      return res.status(400).json({ error: "invalid_file_type" });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO event_attachments (
          event_id,
          uploaded_by,
          owner_id,
          group_id,
          original_name,
          stored_name,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, event_id AS "eventId", original_name AS "originalName", mime_type AS "mimeType",
                  size_bytes AS "sizeBytes", group_id AS "groupId", created_at AS "createdAt"
      `,
      [
        params.id,
        req.user.sub,
        req.user.sub,
        event.group_id,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size
      ]
    );

    await createAuditLog({
      userId: req.user.sub,
      action: "events.attachment_uploaded",
      entity: "event_attachment",
      entityId: insertResult.rows[0].id,
      metadata: {
        eventId: params.id,
        fileName: req.file.originalname,
        bytes: req.file.size
      },
      req
    });

    emitBitacoraRealtimeEvent("attachment.created", req, {
      id: params.id,
      encargado_id: event.encargado_id
    });

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    if (req.file?.filename) {
      await removeStoredFiles([req.file.filename]);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file_too_large" });
    }

    if (error.message === "invalid_file_type") {
      return res.status(400).json({ error: "invalid_file_type" });
    }
    if (error.message === "invalid_file_name") {
      return res.status(400).json({ error: "invalid_file_name" });
    }
    if (error.message === "invalid_file_extension") {
      return res.status(400).json({ error: "invalid_file_extension" });
    }

    if (error instanceof multer.MulterError) {
      logger.warn({ err: error, code: error.code }, "Solicitud multipart invalida en subida de adjunto");
      return res.status(400).json({ error: "validation_error" });
    }

    const loweredMessage = String(error?.message || "").toLowerCase();
    if (loweredMessage.includes("unexpected field") || loweredMessage.includes("multipart")) {
      return res.status(400).json({ error: "validation_error" });
    }

    if (isUploadStorageError(error)) {
      logger.error({ err: error }, "Almacenamiento de adjuntos no disponible");
      return res.status(503).json({ error: "upload_storage_unavailable" });
    }

    logger.error({ err: error }, "Error inesperado al cargar adjunto");
    return next(error);
  }
});

router.get("/:id/attachments", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentParamsSchema.parse(req.params);
    const event = await getEventWithOwner(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!ensureEventAttachmentPermissionOrNotFound(req, res, event, "view")) {
      return;
    }

    const result = await pool.query(
      `
        SELECT
          id,
          event_id AS "eventId",
          owner_id AS "ownerId",
          uploaded_by AS "uploadedBy",
          group_id AS "groupId",
          original_name AS "originalName",
          mime_type AS "mimeType",
          size_bytes AS "sizeBytes",
          created_at AS "createdAt"
        FROM event_attachments
        WHERE event_id = $1
        ORDER BY created_at DESC
      `,
      [params.id]
    );

    const items = result.rows.map((item) => ({
      ...item,
      permissions: {
        canView: canUserViewFile(req.user, item),
        canEdit: canUserEditFile(req.user, item),
        canDelete: canUserDeleteFile(req.user, item)
      }
    }));

    return res.json({
      items,
      permissions: {
        canUpload: canUserUploadEventAttachment(req.user, event.encargado_id),
        canView: canUserViewEventAttachments(req.user, event.encargado_id)
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/attachments", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = attachmentRepositoryQuerySchema.parse(req.query);
    const actorId = Number(req.user?.sub);
    const canViewAnyAttachments = Boolean(
      getSessionCapabilities(req.user?.role)?.actions?.attachments?.viewAny
    );

    if (!canViewAnyAttachments && (!Number.isInteger(actorId) || actorId <= 0)) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (
      query.ownerId &&
      Number.isInteger(actorId) &&
      query.ownerId !== actorId &&
      !canViewAnyAttachments &&
      !canUserFilterByUser(req.user)
    ) {
      return res.status(403).json({ error: "forbidden" });
    }

    const conditions = [];
    const values = [];
    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (!canViewAnyAttachments) {
      addCondition("ea.owner_id = ?", actorId);
    }

    conditions.push(buildGroupScopeCondition({ alias: "e", user: req.user, params: values, action: "view" }));

    if (query.q) {
      addCondition("LOWER(ea.original_name) LIKE LOWER(?)", `%${query.q}%`);
    }

    if (query.mimeType) {
      addCondition("ea.mime_type = ?", query.mimeType);
    }

    if (query.ownerId) {
      addCondition("ea.owner_id = ?", query.ownerId);
    }

    if (query.groupId) {
      addCondition("e.group_id = ?", query.groupId);
    }

    if (query.from) {
      addCondition("ea.created_at::date >= ?", query.from);
    }

    if (query.to) {
      addCondition("ea.created_at::date <= ?", query.to);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM event_attachments ea
        JOIN events e ON e.id = ea.event_id
        ${whereClause}
      `,
      values
    );
    const total = Number(countResult.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rowsResult = await pool.query(
      `
        SELECT
          ea.id,
          ea.event_id AS "eventId",
          ea.owner_id AS "ownerId",
          ea.uploaded_by AS "uploadedBy",
          ea.original_name AS "originalName",
          ea.mime_type AS "mimeType",
          ea.size_bytes AS "sizeBytes",
          ea.created_at AS "createdAt",
          ea.group_id AS "groupId",
          e.fecha AS "eventDate",
          e.group_id AS "eventGroupId",
          g.name AS "groupName",
          g.slug AS "groupSlug",
          owner_user.name AS "ownerName",
          owner_user.email AS "ownerEmail",
          uploaded_user.name AS "uploadedByName",
          uploaded_user.email AS "uploadedByEmail"
        FROM event_attachments ea
        JOIN events e ON e.id = ea.event_id
        LEFT JOIN groups g ON g.id = e.group_id
        LEFT JOIN users owner_user ON owner_user.id = ea.owner_id
        LEFT JOIN users uploaded_user ON uploaded_user.id = ea.uploaded_by
        ${whereClause}
        ORDER BY ea.created_at DESC, ea.id DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset]
    );

    const items = rowsResult.rows
      .filter((item) => canUserViewFile(req.user, item))
      .map((item) => ({
        ...item,
        relationType: "bitacora",
        relationLabel: `Bitacora #${item.eventId}`,
        permissions: {
          canView: canUserViewFile(req.user, item),
          canEdit: canUserEditFile(req.user, item),
          canDelete: canUserDeleteFile(req.user, item)
        }
      }));

    return res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/attachments/:attachmentId/download", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentDownloadSchema.parse(req.params);

    const attachment = await getAttachmentById(params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    if (!canUserViewFile(req.user, attachment)) {
      await auditAttachmentAccessDenied(req, params.attachmentId, "view_forbidden");
      return res.status(403).json({ error: "forbidden" });
    }

    const filePath = resolveStoredAttachmentPath(attachment.storedName);
    if (!filePath) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    await fs.access(filePath);

    const downloadName = safeDownloadFileName(
      attachment.originalName,
      attachment.mimeType,
      attachment.id
    );
    res.setHeader("Content-Type", attachment.mimeType);
    return res.download(filePath, downloadName);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }

    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    return next(error);
  }
});

router.get("/attachments/:attachmentId/preview", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentDownloadSchema.parse(req.params);
    const attachment = await getAttachmentById(params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    if (!canUserViewFile(req.user, attachment)) {
      await auditAttachmentAccessDenied(req, params.attachmentId, "preview_forbidden");
      return res.status(403).json({ error: "forbidden" });
    }

    if (!previewableMimeTypes.has(attachment.mimeType)) {
      return res.status(415).json({ error: "preview_not_supported" });
    }

    const filePath = resolveStoredAttachmentPath(attachment.storedName);
    if (!filePath) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    await fs.access(filePath);

    const previewName = safeDownloadFileName(
      attachment.originalName,
      attachment.mimeType,
      attachment.id
    );

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
    );
    res.setHeader("Content-Disposition", `inline; filename="${previewName.replace(/"/g, "")}"`);
    return res.sendFile(filePath);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }

    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    return next(error);
  }
});

router.patch("/attachments/:attachmentId", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentDownloadSchema.parse(req.params);
    const payload = updateAttachmentSchema.parse(req.body);
    const attachment = await getAttachmentById(params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    if (!canUserEditFile(req.user, attachment)) {
      await auditAttachmentAccessDenied(req, params.attachmentId, "edit_forbidden");
      return res.status(403).json({ error: "forbidden" });
    }

    const safeName = sanitizeOriginalFileName(payload.originalName);
    if (!safeName) {
      return res.status(400).json({ error: "invalid_file_name" });
    }
    if (!hasAllowedExtensionForMime(safeName, attachment.mimeType)) {
      return res.status(400).json({ error: "invalid_file_extension" });
    }

    const result = await pool.query(
      `
        UPDATE event_attachments
        SET original_name = $2
        WHERE id = $1
        RETURNING
          id,
          event_id AS "eventId",
          owner_id AS "ownerId",
          uploaded_by AS "uploadedBy",
          group_id AS "groupId",
          original_name AS "originalName",
          mime_type AS "mimeType",
          size_bytes AS "sizeBytes",
          created_at AS "createdAt"
      `,
      [params.attachmentId, safeName]
    );

    await createAuditLog({
      userId: req.user.sub,
      action: "events.attachment_updated",
      entity: "event_attachment",
      entityId: params.attachmentId,
      metadata: {
        beforeName: attachment.originalName,
        afterName: safeName
      },
      req
    });

    emitBitacoraRealtimeEvent("attachment.updated", req, {
      id: attachment.eventId,
      encargadoId: attachment.encargadoId
    });

    const updated = result.rows[0];
    return res.json({
      ...updated,
      permissions: {
        canView: canUserViewFile(req.user, updated),
        canEdit: canUserEditFile(req.user, updated),
        canDelete: canUserDeleteFile(req.user, updated)
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.delete("/attachments/:attachmentId", authenticate, async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "adjuntos")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = attachmentDownloadSchema.parse(req.params);
    const attachment = await getAttachmentById(params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    if (!canUserDeleteFile(req.user, attachment)) {
      await auditAttachmentAccessDenied(req, params.attachmentId, "delete_forbidden");
      return res.status(403).json({ error: "forbidden" });
    }

    await pool.query("DELETE FROM event_attachments WHERE id = $1", [params.attachmentId]);
    await removeStoredFiles([attachment.storedName]);

    await createAuditLog({
      userId: req.user.sub,
      action: "events.attachment_deleted",
      entity: "event_attachment",
      entityId: params.attachmentId,
      metadata: {
        eventId: attachment.eventId,
        fileName: attachment.originalName
      },
      req
    });

    emitBitacoraRealtimeEvent("attachment.deleted", req, {
      id: attachment.eventId,
      encargadoId: attachment.encargadoId
    });

    return res.json({ message: "Adjunto eliminado correctamente" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { eventsRouter: router };










