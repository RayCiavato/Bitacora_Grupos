const cron = require("node-cron");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const { createAuditLog } = require("./audit");
const {
  canUserViewGroupResource,
  enrichUserWithGroupAccess
} = require("./groups");

const APP_TIMEZONE = "America/Caracas";
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function isTelegramEnabled() {
  return Boolean(config.telegramEnabled && config.telegramBotToken);
}

function normalizeChatId(value) {
  const raw = String(value || "").trim();
  return raw || null;
}

function getTelegramTargetChatIds() {
  const chatIds = Array.isArray(config.telegramChatIds)
    ? config.telegramChatIds
    : String(config.telegramChatIds || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const normalizedList = chatIds
    .map((chatId) => normalizeChatId(chatId))
    .filter(Boolean);
  if (normalizedList.length > 0) {
    return Array.from(new Set(normalizedList));
  }

  const legacy = normalizeChatId(config.telegramChatId);
  return legacy ? [legacy] : [];
}

function normalizeGroupKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTelegramGroupChatMap() {
  const entries = Array.isArray(config.telegramGroupChatIds) ? config.telegramGroupChatIds : [];
  const map = new Map();
  for (const entry of entries) {
    const normalizedEntry = String(entry || "");
    const separatorIndex = normalizedEntry.includes("=")
      ? normalizedEntry.indexOf("=")
      : normalizedEntry.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const rawKey = normalizedEntry.slice(0, separatorIndex);
    const rawChatValue = normalizedEntry.slice(separatorIndex + 1);
    const key = normalizeGroupKey(rawKey);
    const chatId = normalizeChatId(rawChatValue);
    if (!key || !chatId) {
      continue;
    }
    map.set(key, Array.from(new Set([...(map.get(key) || []), chatId])));
  }
  return map;
}

function getTelegramGroupChatIds(group = {}) {
  const map = getTelegramGroupChatMap();
  const keys = [group?.slug, group?.id, group?.name].map(normalizeGroupKey).filter(Boolean);
  const chatIds = [];
  for (const key of keys) {
    chatIds.push(...(map.get(key) || []));
  }
  return Array.from(new Set(chatIds));
}

async function getAuthorizedTelegramChatIdsForGroup(group = {}) {
  const chatIds = [...getTelegramGroupChatIds(group)];
  const groupId = Number(group?.id || 0);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return Array.from(new Set(chatIds));
  }

  try {
    const result = await pool.query(
      `
        SELECT
          source.id,
          source.name,
          source.slug
        FROM group_access_policies p
        JOIN groups source ON source.id = p.source_group_id
        WHERE p.target_group_id = $1
          AND p.resource_type = 'all'
          AND p.can_view = TRUE
          AND source.is_active = TRUE
      `,
      [groupId]
    );
    for (const row of result.rows) {
      chatIds.push(...getTelegramGroupChatIds(row));
    }
  } catch (error) {
    logger.warn({ err: error, groupId }, "No se pudo resolver visibilidad Telegram por grupo");
  }

  return Array.from(new Set(chatIds));
}

function normalizeTelegramRecipient(recipient) {
  if (!recipient) {
    return null;
  }
  if (typeof recipient === "string" || typeof recipient === "number") {
    const chatId = normalizeChatId(recipient);
    return chatId ? { chatId, chatType: "group", userId: null } : null;
  }

  const chatId = normalizeChatId(recipient.chatId ?? recipient.chat_id);
  if (!chatId) {
    return null;
  }

  return {
    chatId,
    chatType: recipient.chatType || recipient.chat_type || "group",
    userId: recipient.userId ? Number(recipient.userId) : null,
    groupId: recipient.groupId ? Number(recipient.groupId) : null,
    reason: recipient.reason || null
  };
}

function dedupeTelegramRecipients(recipients = []) {
  const seen = new Set();
  const deduped = [];
  for (const recipient of recipients) {
    const normalized = normalizeTelegramRecipient(recipient);
    if (!normalized || seen.has(normalized.chatId)) {
      continue;
    }
    seen.add(normalized.chatId);
    deduped.push(normalized);
  }
  return deduped;
}

async function auditTelegramNotification({
  action,
  userId = null,
  entity = "notification",
  entityId = null,
  metadata = {},
  recipient = null,
  reason = null
} = {}) {
  await createAuditLog({
    userId,
    action,
    entity,
    entityId,
    metadata: {
      channel: "telegram",
      reason,
      recipientUserId: recipient?.userId || null,
      recipientChatType: recipient?.chatType || null,
      recipientGroupId: recipient?.groupId || null,
      chatType: recipient?.chatType || null,
      groupId: metadata.groupId || recipient?.groupId || null,
      resourceType: entity,
      eventType: metadata.kind || metadata.eventType || null,
      deliveryScope: metadata.deliveryScope || null
    }
  });
}

async function listActiveLinkedTelegramUsers() {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        l.telegram_private_chat_id AS "telegramPrivateChatId",
        l.telegram_user_id AS "telegramUserId",
        l.last_used_at AS "lastUsedAt",
        l.session_expires_at AS "sessionExpiresAt"
      FROM user_telegram_links l
      JOIN users u ON u.id = l.user_id
      WHERE l.telegram_private_chat_id IS NOT NULL
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
        AND (l.session_expires_at IS NULL OR l.session_expires_at > NOW())
      ORDER BY u.id ASC
    `
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    sub: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    telegramPrivateChatId: row.telegramPrivateChatId,
    telegramUserId: row.telegramUserId,
    lastUsedAt: row.lastUsedAt,
    sessionExpiresAt: row.sessionExpiresAt
  }));
}

async function getTelegramRecipientsForGroup(group = {}, resourceType = "notification", action = "view", auditContext = {}) {
  const groupId = Number(group?.id || group?.groupId || 0);
  const recipients = [];

  if (!Number.isInteger(groupId) || groupId <= 0) {
    await auditTelegramNotification({
      action: "telegram.notification.skipped",
      userId: auditContext.userId || null,
      entity: auditContext.entity || resourceType,
      entityId: auditContext.entityId || null,
      metadata: {
        ...auditContext.metadata,
        groupId: null,
        requestedAction: action
      },
      reason: "missing_group"
    });
    return [];
  }

  const groupChatIds = await getAuthorizedTelegramChatIdsForGroup(group);
  recipients.push(
    ...groupChatIds.map((chatId) => ({
      chatId,
      chatType: "group",
      groupId
    }))
  );

  let linkedUsers = [];
  try {
    linkedUsers = await listActiveLinkedTelegramUsers();
  } catch (error) {
    logger.warn({ err: error, groupId }, "No se pudieron resolver usuarios Telegram vinculados");
  }

  for (const linkedUser of linkedUsers) {
    let enrichedUser = linkedUser;
    try {
      // eslint-disable-next-line no-await-in-loop
      enrichedUser = await enrichUserWithGroupAccess(linkedUser);
    } catch (error) {
      logger.warn({ err: error, userId: linkedUser.id }, "No se pudo resolver ABAC de usuario Telegram");
      // eslint-disable-next-line no-await-in-loop
      await auditTelegramNotification({
        action: "telegram.notification.denied",
        userId: linkedUser.id,
        entity: auditContext.entity || resourceType,
        entityId: auditContext.entityId || null,
        metadata: {
          ...auditContext.metadata,
          groupId,
          requestedAction: action
        },
        recipient: {
          userId: linkedUser.id,
          chatId: linkedUser.telegramPrivateChatId,
          chatType: "individual",
          groupId
        },
        reason: "abac_resolution_failed"
      });
      continue;
    }

    if (canUserViewGroupResource(enrichedUser, { groupId })) {
      recipients.push({
        chatId: linkedUser.telegramPrivateChatId,
        chatType: "individual",
        userId: linkedUser.id,
        groupId
      });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await auditTelegramNotification({
      action: "telegram.notification.denied",
      userId: linkedUser.id,
      entity: auditContext.entity || resourceType,
      entityId: auditContext.entityId || null,
      metadata: {
        ...auditContext.metadata,
        groupId,
        requestedAction: action
      },
      recipient: {
        userId: linkedUser.id,
        chatId: linkedUser.telegramPrivateChatId,
        chatType: "individual",
        groupId
      },
      reason: "abac_denied"
    });
  }

  return dedupeTelegramRecipients(recipients);
}

async function getTelegramRecipientsForResource(resourceType, resource, eventType = null) {
  const group = resource?.group || {
    id: resource?.groupId || resource?.group_id,
    name: resource?.groupName || resource?.group_name,
    slug: resource?.groupSlug || resource?.group_slug
  };

  return getTelegramRecipientsForGroup(group, resourceType, "view", {
    entity: resourceType,
    entityId: Number(resource?.id || 0) || null,
    metadata: {
      kind: eventType,
      groupId: Number(group?.id || 0) || null
    }
  });
}

function sanitizeText(value, fallback = "-", maxLength = 300) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
}

function sanitizeTelegramMessage(value, fallback = "-", maxLength = 3900) {
  const raw = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const normalized = raw
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
}

function parseDateOnlyAsCaracas(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00-04:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatDateCaracas(value) {
  const parsedDate = parseDateOnlyAsCaracas(value);
  if (parsedDate) {
    return DATE_ONLY_FORMATTER.format(parsedDate);
  }

  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return sanitizeText(value);
  }

  return DATE_ONLY_FORMATTER.format(parsed);
}

function formatDateTimeCaracas(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return DATE_TIME_FORMATTER.format(new Date());
  }
  return DATE_TIME_FORMATTER.format(parsed);
}

function sanitizeErrorForAudit(error) {
  if (!error) {
    return "unknown_error";
  }
  const message = typeof error.message === "string" ? error.message : String(error);
  return message.slice(0, 300);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function sendTelegramMessage({
  text,
  userId = null,
  entity = "notification",
  entityId = null,
  metadata = {},
  targetChatIds = null,
  targetRecipients = null
} = {}) {
  if (!isTelegramEnabled()) {
    return { ok: false, skipped: true, reason: "telegram_disabled" };
  }

  const normalizedText = sanitizeTelegramMessage(text, "-", 3900);
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const resolvedRecipients = dedupeTelegramRecipients(
    Array.isArray(targetRecipients)
      ? targetRecipients
      : Array.isArray(targetChatIds)
        ? targetChatIds.map((chatId) => ({
            chatId,
            chatType: metadata.deliveryScope?.includes("global") ? "global" : "group"
          }))
        : getTelegramTargetChatIds().map((chatId) => ({ chatId, chatType: "global" }))
  );
  if (!resolvedRecipients.length) {
    await auditTelegramNotification({
      action: "telegram.notification.skipped",
      userId,
      entity,
      entityId,
      metadata,
      reason: "telegram_chat_missing"
    });
    return { ok: false, skipped: true, reason: "telegram_chat_missing" };
  }

  let sentCount = 0;
  let lastMessageId = null;
  let lastError = null;
  for (const recipient of resolvedRecipients) {
    const targetChatId = recipient.chatId;
    let delivered = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: normalizedText,
            disable_web_page_preview: true
          })
        });

        let body = null;
        try {
          body = await response.json();
        } catch (_error) {
          body = null;
        }

        if (!response.ok || !body?.ok) {
          const detail = body?.description || `HTTP ${response.status}`;
          throw new Error(`telegram_send_failed:${detail}`);
        }

        sentCount += 1;
        lastMessageId = body?.result?.message_id || lastMessageId;
        delivered = true;
        // eslint-disable-next-line no-await-in-loop
        await auditTelegramNotification({
          action: "telegram.notification.sent",
          userId,
          entity,
          entityId,
          metadata,
          recipient
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await delay(1200);
        }
      }
    }

    if (!delivered) {
      logger.warn({ targetChatId }, "Fallo envio Telegram a chat destino");
      // eslint-disable-next-line no-await-in-loop
      await auditTelegramNotification({
        action: "telegram.notification.failed",
        userId,
        entity,
        entityId,
        metadata: {
          ...metadata,
          error: sanitizeErrorForAudit(lastError)
        },
        recipient,
        reason: "send_failed"
      });
    }
  }

  if (sentCount > 0) {
    await createAuditLog({
      userId,
      action: "notifications.telegram_sent",
      entity,
      entityId,
      metadata: {
        channel: "telegram",
        sentCount,
        targetChats: resolvedRecipients.map((recipient) => recipient.chatId),
        ...metadata
      }
    });

    return {
      ok: true,
      messageId: lastMessageId
    };
  }

  await createAuditLog({
    userId,
    action: "notifications.telegram_failed",
    entity,
    entityId,
      metadata: {
        channel: "telegram",
        targetChats: resolvedRecipients.map((recipient) => recipient.chatId),
        error: sanitizeErrorForAudit(lastError),
        ...metadata
      }
  });

  logger.warn(
    {
      err: lastError,
      entity,
      entityId
    },
    "No se pudo enviar notificacion Telegram"
  );

  return {
    ok: false,
    error: lastError || new Error("telegram_send_failed")
  };
}

async function sendGroupAwareTelegramMessage({
  detailedText,
  safeText,
  group,
  userId = null,
  entity = "notification",
  entityId = null,
  metadata = {}
} = {}) {
  const scopedMetadata = {
    ...metadata,
    groupId: group?.id || null,
    groupName: group?.name || null,
    groupSlug: group?.slug || null
  };
  const detailedRecipients = await getTelegramRecipientsForGroup(group, entity, "view", {
    userId,
    entity,
    entityId,
    metadata: scopedMetadata
  });
  const detailChatIds = new Set(detailedRecipients.map((recipient) => recipient.chatId));
  const globalRecipients = getTelegramTargetChatIds()
    .map((chatId) => ({ chatId, chatType: "global", userId: null, groupId: group?.id || null }))
    .filter((recipient) => !detailChatIds.has(recipient.chatId));

  let detailedResult = null;
  if (detailedRecipients.length > 0) {
    detailedResult = await sendTelegramMessage({
      text: detailedText,
      userId,
      entity,
      entityId,
      metadata: {
        ...scopedMetadata,
        deliveryScope: "group_detail"
      },
      targetRecipients: detailedRecipients
    });
  }

  let summaryResult = null;
  if (globalRecipients.length > 0) {
    summaryResult = await sendTelegramMessage({
      text: safeText,
      userId,
      entity,
      entityId,
      metadata: {
        ...scopedMetadata,
        deliveryScope: detailedRecipients.length > 0 ? "global_minimal_copy" : "global_minimal_only"
      },
      targetRecipients: globalRecipients
    });
  }

  if (detailedResult?.ok || summaryResult?.ok) {
    return { ok: true, detailed: detailedResult, summary: summaryResult };
  }

  await auditTelegramNotification({
    action: "telegram.notification.skipped",
    userId,
    entity,
    entityId,
    metadata: scopedMetadata,
    reason: "no_authorized_recipient"
  });

  return detailedResult || summaryResult || { ok: false, skipped: true, reason: "no_authorized_recipient" };
}

function runDetached(asyncWork, contextLabel) {
  setImmediate(() => {
    Promise.resolve()
      .then(asyncWork)
      .catch((error) => {
        logger.warn({ err: error, contextLabel }, "Fallo una tarea asincrona de Telegram");
      });
  });
}

function extractTaskCore(task) {
  return {
    id: Number(task?.id || 0) || null,
    title: sanitizeText(task?.title, "Sin titulo", 180),
    priority: sanitizeText(task?.priority, "media", 20),
    status: sanitizeText(task?.status, "sin_realizar", 32),
    dueDate: task?.dueDate || null,
    createdBy: sanitizeText(task?.createdBy?.name || task?.createdByName || "Sistema", "Sistema", 120),
    assignedTo: sanitizeText(task?.assignedTo?.name || task?.assignedToName || "Sin asignar", "Sin asignar", 120),
    group: {
      id: Number(task?.group?.id || task?.groupId || task?.group_id || 0) || null,
      name: sanitizeText(task?.group?.name || task?.groupName || "Sin grupo", "Sin grupo", 120),
      slug: sanitizeText(task?.group?.slug || task?.groupSlug || "", "", 120)
    }
  };
}

function extractBitacoraCore(event) {
  return {
    id: Number(event?.id || 0) || null,
    actividad: sanitizeText(event?.descripcionActividad || event?.actividad || "-", "-", 220),
    observacion: sanitizeText(event?.observacion || "-", "-", 260),
    prioridad: sanitizeText(event?.prioridad || "media", "media", 20),
    group: {
      id: Number(event?.group?.id || event?.groupId || event?.group_id || 0) || null,
      name: sanitizeText(event?.group?.name || event?.groupName || "Sin grupo", "Sin grupo", 120),
      slug: sanitizeText(event?.group?.slug || event?.groupSlug || "", "", 120)
    }
  };
}

function buildMinimalGroupMessage({ title, kind, group } = {}) {
  return [
    sanitizeText(title, "Actualizacion operativa", 120),
    "",
    `Area: ${sanitizeText(group?.name || "Sin grupo", "Sin grupo", 120)}`,
    `Tipo: ${sanitizeText(kind, "notificacion", 80)}`,
    `Fecha: ${formatDateTimeCaracas(new Date())}`,
    "",
    "Detalle disponible solo en el panel o en el chat autorizado del area."
  ].join("\n");
}

function buildTaskCreatedMessage(taskCore) {
  return [
    "📌 NUEVA TAREA REGISTRADA",
    "",
    `🧾 Título: ${taskCore.title}`,
    `👤 Creado por: ${taskCore.createdBy}`,
    `👥 Asignado a: ${taskCore.assignedTo}`,
    `⚠️ Prioridad: ${taskCore.priority}`,
    `📅 Vence: ${formatDateCaracas(taskCore.dueDate)}`,
    `📊 Estado: ${taskCore.status}`
  ].join("\n");
}

function buildTaskAssignedMessage(taskCore, actorName) {
  return [
    "👥 TAREA ASIGNADA",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Asignada por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `👥 Responsable: ${taskCore.assignedTo}`,
    `⚠️ Prioridad: ${taskCore.priority}`,
    `📅 Vence: ${formatDateCaracas(taskCore.dueDate)}`
  ].join("\n");
}

function buildTaskStatusMessage(taskCore, actorName) {
  return [
    "🔄 ACTUALIZACIÓN DE TAREA",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Modificado por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `📊 Nuevo estado: ${taskCore.status}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function buildTaskPriorityMessage(taskCore, actorName) {
  return [
    "⚠️ CAMBIO DE PRIORIDAD",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Modificado por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `⚠️ Nueva prioridad: ${taskCore.priority}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function buildTaskCompletedMessage(taskCore, actorName) {
  return [
    "✅ TAREA COMPLETADA",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Completada por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function buildTaskDueSoonMessage(taskCore, hoursRemaining) {
  return [
    "⚠️ TAREA POR VENCER",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Responsable: ${taskCore.assignedTo}`,
    `📅 Vence en: ${Math.max(1, Math.ceil(Number(hoursRemaining) || 0))} horas`
  ].join("\n");
}

function buildTaskOverdueMessage(taskCore) {
  return [
    "🚨 TAREA VENCIDA",
    "",
    `🧾 Tarea: ${taskCore.title}`,
    `👤 Responsable: ${taskCore.assignedTo}`,
    `📅 Fecha de vencimiento: ${formatDateCaracas(taskCore.dueDate)}`
  ].join("\n");
}

function buildBitacoraCreatedMessage(bitacoraCore, actorName) {
  return [
    "📓 NUEVA BITÁCORA REGISTRADA",
    "",
    `👤 Creado por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `🧾 Actividad: ${bitacoraCore.actividad}`,
    `📝 Observación: ${bitacoraCore.observacion}`,
    `⚠️ Prioridad: ${bitacoraCore.prioridad}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function buildBitacoraUpdatedMessage(bitacoraCore, actorName) {
  return [
    "✏️ BITÁCORA ACTUALIZADA",
    "",
    `👤 Modificado por: ${sanitizeText(actorName, "Sistema", 120)}`,
    `🧾 Actividad: ${bitacoraCore.actividad}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function buildBitacoraCorrelationMessage({ correlation, source, target, actorName } = {}) {
  return [
    "🔗 BITÁCORA CORRELACIONADA",
    "",
    `👤 Usuario: ${sanitizeText(actorName, "Sistema", 120)}`,
    `📌 Origen: BIT-${Number(source?.id || correlation?.sourceEventId || 0) || "-"}`,
    `📎 Relacionada con: BIT-${Number(target?.id || correlation?.targetEventId || 0) || "-"}`,
    `🏷 Tipo: ${sanitizeText(correlation?.relationType || correlation?.relation_type || "relacionado", "relacionado", 40)}`,
    `📝 Motivo: ${sanitizeText(correlation?.note || "-", "-", 260)}`,
    `📅 Fecha: ${formatDateTimeCaracas(new Date())}`
  ].join("\n");
}

function notifyTaskCreated({ task, actorName, actorId } = {}) {
  const taskCore = extractTaskCore(task);
  if (actorName) {
    taskCore.createdBy = sanitizeText(actorName, "Sistema", 120);
  }
  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskCreatedMessage(taskCore),
    safeText: buildMinimalGroupMessage({
      title: "📌 Nueva tarea registrada",
      kind: "task_created",
      group: taskCore.group
    }),
    group: taskCore.group,
    userId: actorId || null,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_created"
    }
  });
}

function notifyTaskAssigned({ task, actorName, actorId } = {}) {
  const taskCore = extractTaskCore(task);
  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskAssignedMessage(taskCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "👥 Tarea asignada",
      kind: "task_assigned",
      group: taskCore.group
    }),
    group: taskCore.group,
    userId: actorId || null,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_assigned"
    }
  });
}

function notifyTaskStatusChanged({ task, actorName, actorId } = {}) {
  const taskCore = extractTaskCore(task);
  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskStatusMessage(taskCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "🔄 Actualizacion de tarea",
      kind: "task_status_changed",
      group: taskCore.group
    }),
    group: taskCore.group,
    userId: actorId || null,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_status_changed",
      status: taskCore.status
    }
  });
}

function notifyTaskPriorityChanged({ task, actorName, actorId } = {}) {
  const taskCore = extractTaskCore(task);
  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskPriorityMessage(taskCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "⚠️ Cambio de prioridad",
      kind: "task_priority_changed",
      group: taskCore.group
    }),
    group: taskCore.group,
    userId: actorId || null,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_priority_changed",
      priority: taskCore.priority
    }
  });
}

function notifyTaskCompleted({ task, actorName, actorId } = {}) {
  const taskCore = extractTaskCore(task);
  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskCompletedMessage(taskCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "✅ Tarea completada",
      kind: "task_completed",
      group: taskCore.group
    }),
    group: taskCore.group,
    userId: actorId || null,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_completed"
    }
  });
}

function notifyBitacoraCreated({ event, actorName, actorId } = {}) {
  const bitacoraCore = extractBitacoraCore(event);
  return sendGroupAwareTelegramMessage({
    detailedText: buildBitacoraCreatedMessage(bitacoraCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "📓 Nueva bitacora registrada",
      kind: "bitacora_created",
      group: bitacoraCore.group
    }),
    group: bitacoraCore.group,
    userId: actorId || null,
    entity: "event",
    entityId: bitacoraCore.id,
    metadata: {
      kind: "bitacora_created"
    }
  });
}

function notifyBitacoraUpdated({ event, actorName, actorId } = {}) {
  const bitacoraCore = extractBitacoraCore(event);
  return sendGroupAwareTelegramMessage({
    detailedText: buildBitacoraUpdatedMessage(bitacoraCore, actorName),
    safeText: buildMinimalGroupMessage({
      title: "✏️ Bitacora actualizada",
      kind: "bitacora_updated",
      group: bitacoraCore.group
    }),
    group: bitacoraCore.group,
    userId: actorId || null,
    entity: "event",
    entityId: bitacoraCore.id,
    metadata: {
      kind: "bitacora_updated"
    }
  });
}

function notifyBitacoraCorrelationCreated({ correlation, source, target, actorName, actorId } = {}) {
  if (!config.telegramNotifyEventCorrelations) {
    return Promise.resolve({
      ok: false,
      skipped: true,
      reason: "event_correlations_notifications_disabled"
    });
  }

  const sourceCore = extractBitacoraCore(source);
  return sendGroupAwareTelegramMessage({
    detailedText: buildBitacoraCorrelationMessage({ correlation, source, target, actorName }),
    safeText: buildMinimalGroupMessage({
      title: "🔗 Bitacora correlacionada",
      kind: "bitacora_correlation_created",
      group: sourceCore.group
    }),
    group: sourceCore.group,
    userId: actorId || null,
    entity: "event_correlation",
    entityId: Number(correlation?.id || 0) || null,
    metadata: {
      kind: "bitacora_correlation_created",
      sourceEventId: Number(source?.id || correlation?.sourceEventId || 0) || null,
      targetEventId: Number(target?.id || correlation?.targetEventId || 0) || null,
      relationType: correlation?.relationType || correlation?.relation_type || null
    }
  });
}

function parseTaskDueBoundaryMs(dueDate) {
  const baseDate = parseDateOnlyAsCaracas(dueDate);
  if (!baseDate) {
    return null;
  }
  return baseDate.getTime() + 24 * 60 * 60 * 1000;
}

function resolveDueCheckpoint(hoursRemaining) {
  if (!Number.isFinite(hoursRemaining)) {
    return null;
  }
  if (hoursRemaining <= 0) {
    return "overdue";
  }
  if (hoursRemaining <= 1) {
    return "1h";
  }
  if (hoursRemaining <= 12) {
    return "12h";
  }
  if (hoursRemaining <= 24) {
    return "24h";
  }
  return null;
}

async function markDueCheckpointIfNew(taskId, checkpointKey, dueDate, payload = {}) {
  const result = await pool.query(
    `
      INSERT INTO task_due_notification_log (task_id, checkpoint_key, due_date, payload)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (task_id, checkpoint_key, due_date) DO NOTHING
      RETURNING id
    `,
    [taskId, checkpointKey, dueDate, JSON.stringify(payload)]
  );

  return result.rowCount > 0;
}

async function rollbackDueCheckpoint(taskId, checkpointKey, dueDate) {
  await pool.query(
    `
      DELETE FROM task_due_notification_log
      WHERE task_id = $1
        AND checkpoint_key = $2
        AND due_date = $3
    `,
    [taskId, checkpointKey, dueDate]
  );
}

async function notifyTaskDueCheckpoint(task, checkpointKey, hoursRemaining) {
  const taskCore = extractTaskCore(task);
  if (checkpointKey === "overdue") {
    return sendGroupAwareTelegramMessage({
      detailedText: buildTaskOverdueMessage(taskCore),
      safeText: buildMinimalGroupMessage({
        title: "🚨 Tarea vencida",
        kind: "task_overdue",
        group: taskCore.group
      }),
      group: taskCore.group,
      entity: "task",
      entityId: taskCore.id,
      metadata: {
        kind: "task_overdue"
      }
    });
  }

  return sendGroupAwareTelegramMessage({
    detailedText: buildTaskDueSoonMessage(taskCore, hoursRemaining),
    safeText: buildMinimalGroupMessage({
      title: "⚠️ Tarea por vencer",
      kind: "task_due_soon",
      group: taskCore.group
    }),
    group: taskCore.group,
    entity: "task",
    entityId: taskCore.id,
    metadata: {
      kind: "task_due_soon",
      checkpoint: checkpointKey,
      hoursRemaining: Math.max(0, Math.ceil(Number(hoursRemaining) || 0))
    }
  });
}

async function runTelegramDueAlertsCycle() {
  if (!isTelegramEnabled()) {
    return { processed: 0, sent: 0 };
  }

  const result = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.priority,
        t.status,
        t.due_date AS "dueDate",
        t.group_id AS "groupId",
        g.name AS "groupName",
        g.slug AS "groupSlug",
        t.assigned_to AS "assignedToId",
        creator.name AS "createdByName",
        assignee.name AS "assignedToName"
      FROM tasks t
      JOIN users creator ON creator.id = t.created_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      LEFT JOIN groups g ON g.id = t.group_id
      WHERE t.deleted_at IS NULL
        AND t.due_date IS NOT NULL
        AND t.status NOT IN ('completada', 'cancelada')
      ORDER BY t.due_date ASC, t.updated_at DESC
      LIMIT 2000
    `
  );

  let sent = 0;
  for (const row of result.rows) {
    const dueBoundaryMs = parseTaskDueBoundaryMs(row.dueDate);
    if (!Number.isFinite(dueBoundaryMs)) {
      continue;
    }

    const hoursRemaining = (dueBoundaryMs - Date.now()) / (60 * 60 * 1000);
    const checkpointKey = resolveDueCheckpoint(hoursRemaining);
    if (!checkpointKey) {
      continue;
    }

    const lockInserted = await markDueCheckpointIfNew(row.id, checkpointKey, row.dueDate, {
      evaluatedAt: new Date().toISOString(),
      hoursRemaining: Number(hoursRemaining.toFixed(2))
    });

    if (!lockInserted) {
      continue;
    }

    const notifyResult = await notifyTaskDueCheckpoint(row, checkpointKey, hoursRemaining);
    if (!notifyResult.ok) {
      await rollbackDueCheckpoint(row.id, checkpointKey, row.dueDate);
      continue;
    }

    sent += 1;
  }

  return {
    processed: result.rowCount,
    sent
  };
}

function startTelegramDueAlertsScheduler() {
  if (!isTelegramEnabled()) {
    logger.info("Alertas Telegram de vencimiento deshabilitadas");
    return null;
  }

  if (!cron.validate(config.telegramTaskAlertCron)) {
    logger.error(
      { cron: config.telegramTaskAlertCron },
      "TELEGRAM_TASK_ALERT_CRON invalido"
    );
    return null;
  }

  const task = cron.schedule(
    config.telegramTaskAlertCron,
    async () => {
      try {
        const result = await runTelegramDueAlertsCycle();
        logger.info(result, "Ciclo de alertas Telegram ejecutado");
      } catch (error) {
        logger.error({ err: error }, "Fallo ciclo de alertas Telegram");
      }
    },
    {
      timezone: APP_TIMEZONE
    }
  );

  logger.info(
    {
      cron: config.telegramTaskAlertCron,
      timezone: APP_TIMEZONE
    },
    "Scheduler Telegram de vencimientos habilitado"
  );

  return task;
}

module.exports = {
  isTelegramEnabled,
  dedupeTelegramRecipients,
  getTelegramRecipientsForGroup,
  getTelegramRecipientsForResource,
  runDetached,
  sendTelegramMessage,
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskStatusChanged,
  notifyTaskPriorityChanged,
  notifyTaskCompleted,
  notifyBitacoraCreated,
  notifyBitacoraUpdated,
  notifyBitacoraCorrelationCreated,
  runTelegramDueAlertsCycle,
  startTelegramDueAlertsScheduler
};
