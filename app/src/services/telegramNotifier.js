const cron = require("node-cron");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const { createAuditLog } = require("./audit");

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
  return Boolean(
    config.telegramEnabled &&
      config.telegramBotToken &&
      getTelegramTargetChatIds().length > 0
  );
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
  metadata = {}
} = {}) {
  if (!isTelegramEnabled()) {
    return { ok: false, skipped: true, reason: "telegram_disabled" };
  }

  const normalizedText = sanitizeTelegramMessage(text, "-", 3900);
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  const targetChatIds = getTelegramTargetChatIds();
  if (!targetChatIds.length) {
    return { ok: false, skipped: true, reason: "telegram_chat_missing" };
  }

  let sentCount = 0;
  let lastMessageId = null;
  let lastError = null;
  for (const targetChatId of targetChatIds) {
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
        targetChats: targetChatIds,
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
      targetChats: targetChatIds,
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
    assignedTo: sanitizeText(task?.assignedTo?.name || task?.assignedToName || "Sin asignar", "Sin asignar", 120)
  };
}

function extractBitacoraCore(event) {
  return {
    id: Number(event?.id || 0) || null,
    actividad: sanitizeText(event?.descripcionActividad || event?.actividad || "-", "-", 220),
    observacion: sanitizeText(event?.observacion || "-", "-", 260),
    prioridad: sanitizeText(event?.prioridad || "media", "media", 20)
  };
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
  return sendTelegramMessage({
    text: buildTaskCreatedMessage(taskCore),
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
  return sendTelegramMessage({
    text: buildTaskAssignedMessage(taskCore, actorName),
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
  return sendTelegramMessage({
    text: buildTaskStatusMessage(taskCore, actorName),
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
  return sendTelegramMessage({
    text: buildTaskPriorityMessage(taskCore, actorName),
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
  return sendTelegramMessage({
    text: buildTaskCompletedMessage(taskCore, actorName),
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
  return sendTelegramMessage({
    text: buildBitacoraCreatedMessage(bitacoraCore, actorName),
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
  return sendTelegramMessage({
    text: buildBitacoraUpdatedMessage(bitacoraCore, actorName),
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

  return sendTelegramMessage({
    text: buildBitacoraCorrelationMessage({ correlation, source, target, actorName }),
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
    return sendTelegramMessage({
      text: buildTaskOverdueMessage(taskCore),
      entity: "task",
      entityId: taskCore.id,
      metadata: {
        kind: "task_overdue"
      }
    });
  }

  return sendTelegramMessage({
    text: buildTaskDueSoonMessage(taskCore, hoursRemaining),
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
        t.assigned_to AS "assignedToId",
        creator.name AS "createdByName",
        assignee.name AS "assignedToName"
      FROM tasks t
      JOIN users creator ON creator.id = t.created_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
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
