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
const { createAuditLog } = require("../services/audit");
const { config } = require("../config");

const router = express.Router();

const createEventSchema = z.object({
  fecha: z.string().date(),
  descripcionActividad: z.string().min(3).max(3000),
  observacion: z.string().min(3).max(3000),
  prioridad: z.enum(["baja", "media", "alta", "observacion"]).default("media"),
  templateId: z.coerce.number().int().positive().optional()
});

const updateEventSchema = z
  .object({
    fecha: z.string().date().optional(),
    descripcionActividad: z.string().min(3).max(3000).optional(),
    observacion: z.string().min(3).max(3000).optional(),
    prioridad: z.enum(["baja", "media", "alta", "observacion"]).optional(),
    templateId: z.number().int().positive().nullable().optional()
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
  to: z.string().date().optional()
});
const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30)
});

const attachmentParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const eventParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const attachmentDownloadSchema = z.object({
  attachmentId: z.coerce.number().int().positive()
});

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
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("invalid_file_type"));
  }
});

function toISODate(date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function isPastDate(dateValue) {
  return dateValue < toISODate(new Date());
}

function buildReportFilters(query) {
  const params = [];
  const whereParts = [];

  const fromIndex = params.push(query.from);
  const toIndex = params.push(query.to);
  whereParts.push(`e.fecha BETWEEN $${fromIndex} AND $${toIndex}`);

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

function getScopedEncargadoId(req, requestedEncargadoId) {
  if (req.user?.role === "admin" || req.user?.role === "supervisor") {
    return requestedEncargadoId || undefined;
  }
  return Number(req.user?.sub);
}

function escapeCsvValue(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsvBuffer(rows) {
  const header = ["Fecha", "Encargado", "Actividad", "Observacion", "Prioridad", "Plantilla"]; 
  const lines = [header.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.fecha,
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
    { header: "Encargado", key: "encargado", width: 22 },
    { header: "Actividad", key: "descripcionActividad", width: 52 },
    { header: "Observacion", key: "observacion", width: 52 },
    { header: "Prioridad", key: "prioridad", width: 12 },
    { header: "Plantilla", key: "templateName", width: 20 }
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      fecha: row.fecha,
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
          `${index + 1}. ${row.fecha} | ${row.encargado} | ${row.prioridad.toUpperCase()}`
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
    encargado_id: event.encargadoId
  };
}

function ensureAdminOnlyOrForbidden(req, res) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return false;
  }

  return true;
}

function ensureEventOwnerOrAdminOrForbidden(req, res, event) {
  if (req.user?.role === "admin") {
    return true;
  }

  if (String(event.encargado_id) !== String(req.user.sub)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }

  return true;
}

router.post("/", authenticate, async (req, res, next) => {
  try {
    const payload = createEventSchema.parse(req.body);
    if (isPastDate(payload.fecha)) {
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
        INSERT INTO events (fecha, descripcion_actividad, observacion, prioridad, encargado_id, template_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          fecha,
          descripcion_actividad AS "descripcionActividad",
          observacion,
          prioridad,
          template_id AS "templateId",
          encargado_id AS "encargadoId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        payload.fecha,
        payload.descripcionActividad,
        payload.observacion,
        payload.prioridad,
        req.user.sub,
        payload.templateId || null
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

    return res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.get("/report", authenticate, async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const scopedQuery = {
      ...query,
      encargadoId: getScopedEncargadoId(req, query.encargadoId)
    };
    const { whereSql, params } = buildReportFilters(scopedQuery);

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
          u.id AS "encargadoId",
          u.name AS encargado,
          u.email AS "encargadoEmail",
          (
            SELECT COUNT(*)::int
            FROM event_attachments ea
            WHERE ea.event_id = e.id
          ) AS "attachmentsCount"
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        LEFT JOIN event_templates t ON t.id = e.template_id
        WHERE ${whereSql}
        ORDER BY e.fecha DESC, e.created_at DESC
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

    return res.json({
      from: query.from,
      to: query.to,
      totalEvents,
      byDate: summaryResult.rows,
      events: eventsResult.rows,
      pagination: {
        page: currentPage,
        pageSize: scopedQuery.pageSize,
        totalPages,
        totalItems: totalEvents
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

async function handleReportExport(req, res, next, source) {
  try {
    const payload = source === "body" ? exportBodySchema.parse(req.body) : exportQuerySchema.parse(req.query);
    const scopedPayload = {
      ...payload,
      encargadoId: getScopedEncargadoId(req, payload.encargadoId)
    };
    const { whereSql, params } = buildReportFilters(scopedPayload);

    const eventsResult = await pool.query(
      `
        SELECT
          e.id,
          e.fecha,
          e.descripcion_actividad AS "descripcionActividad",
          e.observacion,
          e.prioridad,
          t.name AS "templateName",
          u.name AS encargado
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        LEFT JOIN event_templates t ON t.id = e.template_id
        WHERE ${whereSql}
        ORDER BY e.fecha DESC, e.created_at DESC
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
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
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
    const query = trendsQuerySchema.parse(req.query);
    const to = query.to || toISODate(new Date());
    const from =
      query.from || toISODate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

    const reportQuery = {
      from,
      to,
      q: undefined,
      priority: undefined,
      encargadoId: getScopedEncargadoId(req, undefined),
      page: 1,
      pageSize: 50
    };

    const { whereSql, params } = buildReportFilters(reportQuery);

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
        SELECT u.name AS encargado, COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE ${whereSql}
        GROUP BY u.name
        ORDER BY total DESC, u.name ASC
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
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const days = query.days;
    const today = toISODate(new Date());
    const from = toISODate(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));

    const totalsResult = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE fecha = CURRENT_DATE)::int AS hoy,
          COUNT(*) FILTER (WHERE prioridad = 'alta')::int AS alta,
          COUNT(*) FILTER (WHERE prioridad = 'media')::int AS media,
          COUNT(*) FILTER (WHERE prioridad = 'baja')::int AS baja
        FROM events
      `
    );

    const byUserResult = await pool.query(
      `
        SELECT
          u.name AS encargado,
          COUNT(*)::int AS total
        FROM events e
        JOIN users u ON u.id = e.encargado_id
        WHERE e.fecha >= CURRENT_DATE - ($1::int - 1)
        GROUP BY u.name
        ORDER BY total DESC, u.name ASC
        LIMIT 12
      `,
      [days]
    );

    const byPriorityResult = await pool.query(
      `
        SELECT
          prioridad,
          COUNT(*)::int AS total
        FROM events
        WHERE prioridad IN ('alta', 'media', 'baja')
        GROUP BY prioridad
      `
    );

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
        LEFT JOIN events e ON e.fecha = c.fecha
        GROUP BY c.fecha
        ORDER BY c.fecha ASC
      `,
      [days]
    );

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
      byUser: byUserResult.rows,
      byPriority: byPriorityResult.rows,
      byDate: byDateResult.rows
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    if (!ensureAdminOnlyOrForbidden(req, res)) {
      return;
    }

    const params = eventParamsSchema.parse(req.params);
    const payload = updateEventSchema.parse(req.body);
    const event = await getEventById(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (payload.fecha && isPastDate(payload.fecha)) {
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

    return res.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    if (!ensureAdminOnlyOrForbidden(req, res)) {
      return;
    }

    const params = eventParamsSchema.parse(req.params);
    const event = await getEventById(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    await pool.query("DELETE FROM events WHERE id = $1", [params.id]);

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

    return res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.post("/:id/attachments", authenticate, async (req, res, next) => {
  try {
    const params = attachmentParamsSchema.parse(req.params);
    const event = await getEventWithOwner(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!ensureEventOwnerOrAdminOrForbidden(req, res, event)) {
      return;
    }

    await runUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: "file_required" });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO event_attachments (event_id, uploaded_by, original_name, stored_name, mime_type, size_bytes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, event_id AS "eventId", original_name AS "originalName", mime_type AS "mimeType",
                  size_bytes AS "sizeBytes", created_at AS "createdAt"
      `,
      [
        params.id,
        req.user.sub,
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

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file_too_large" });
    }

    if (error.message === "invalid_file_type") {
      return res.status(400).json({ error: "invalid_file_type" });
    }

    return next(error);
  }
});

router.get("/:id/attachments", authenticate, async (req, res, next) => {
  try {
    const params = attachmentParamsSchema.parse(req.params);
    const event = await getEventWithOwner(params.id);

    if (!event) {
      return res.status(404).json({ error: "event_not_found" });
    }

    if (!ensureEventOwnerOrAdminOrForbidden(req, res, event)) {
      return;
    }

    const result = await pool.query(
      `
        SELECT
          id,
          event_id AS "eventId",
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

    return res.json(result.rows);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.get("/attachments/:attachmentId/download", authenticate, async (req, res, next) => {
  try {
    const params = attachmentDownloadSchema.parse(req.params);

    const attachmentResult = await pool.query(
      `
        SELECT
          ea.id,
          ea.event_id,
          ea.original_name,
          ea.stored_name,
          ea.mime_type,
          ea.size_bytes,
          e.encargado_id
        FROM event_attachments ea
        JOIN events e ON e.id = ea.event_id
        WHERE ea.id = $1
        LIMIT 1
      `,
      [params.attachmentId]
    );

    if (attachmentResult.rowCount === 0) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    const attachment = attachmentResult.rows[0];
    if (!ensureEventOwnerOrAdminOrForbidden(req, res, attachment)) {
      return;
    }
    const normalizedStoredName = path.basename(String(attachment.stored_name || ""));
    if (!normalizedStoredName || normalizedStoredName !== attachment.stored_name) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    const uploadsRoot = path.resolve(config.uploadDir);
    const filePath = path.resolve(uploadsRoot, normalizedStoredName);
    if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    await fs.access(filePath);

    res.setHeader("Content-Type", attachment.mime_type);
    return res.download(filePath, attachment.original_name);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }

    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "attachment_not_found" });
    }

    return next(error);
  }
});

module.exports = { eventsRouter: router };
