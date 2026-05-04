const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const {
  isTelegramPollingModeEnabled,
  telegramApiRequest,
  processTelegramUpdate,
  extractUpdateMetadata,
  evaluateWebhookRateLimit,
  auditWebhookRateLimited
} = require("./telegramBot");

const POLLING_OFFSET_SETTING_KEY = "telegram_polling_offset";
const POLLING_SOURCE_IP = "telegram-polling";
const MAX_BACKOFF_MS = 30000;
const ALLOWED_UPDATE_TYPES = new Set(["message", "callback_query"]);

const pollingState = {
  running: false,
  stopping: false,
  inFlight: false,
  timer: null,
  backoffMs: 0,
  lastOffset: null,
  webhookDeleted: false
};

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function getPollingTimeoutSeconds() {
  return Math.trunc(clampNumber(config.telegramPollingTimeout, 0, 50, 30));
}

function getPollingIntervalMs() {
  return Math.trunc(Math.max(250, Number(config.telegramPollingIntervalMs) || 1000));
}

function getPollingAllowedUpdates() {
  const configured = Array.isArray(config.telegramPollingAllowedUpdates)
    ? config.telegramPollingAllowedUpdates
    : String(config.telegramPollingAllowedUpdates || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const allowed = configured.filter((item) => ALLOWED_UPDATE_TYPES.has(item));
  return allowed.length > 0 ? Array.from(new Set(allowed)) : ["message", "callback_query"];
}

function normalizeOffset(value) {
  const offset = Number(value);
  return Number.isSafeInteger(offset) && offset > 0 ? offset : null;
}

function buildGetUpdatesPayload(offset = null) {
  const payload = {
    timeout: getPollingTimeoutSeconds(),
    allowed_updates: getPollingAllowedUpdates()
  };
  const normalizedOffset = normalizeOffset(offset);
  if (normalizedOffset) {
    payload.offset = normalizedOffset;
  }
  return payload;
}

function isTelegramPollingConfigured() {
  return isTelegramPollingModeEnabled();
}

async function loadPollingOffset() {
  const result = await pool.query(
    `
      SELECT value_json
      FROM system_settings
      WHERE setting_key = $1
    `,
    [POLLING_OFFSET_SETTING_KEY]
  );
  const rawOffset = result.rows[0]?.value_json?.offset;
  return normalizeOffset(rawOffset);
}

async function savePollingOffset(offset) {
  const normalizedOffset = normalizeOffset(offset);
  if (!normalizedOffset) {
    return;
  }

  await pool.query(
    `
      INSERT INTO system_settings (setting_key, value_json, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET
        value_json = EXCLUDED.value_json,
        updated_at = NOW()
    `,
    [
      POLLING_OFFSET_SETTING_KEY,
      JSON.stringify({
        offset: normalizedOffset,
        updatedAt: new Date().toISOString()
      })
    ]
  );
}

async function ensureWebhookDeletedForPolling() {
  if (pollingState.webhookDeleted) {
    return;
  }

  const result = await telegramApiRequest("deleteWebhook", {
    drop_pending_updates: false
  });
  if (!result.ok) {
    throw new Error(result.error || "telegram_delete_webhook_failed");
  }

  pollingState.webhookDeleted = true;
  logger.info("Webhook de Telegram eliminado para habilitar long polling");
}

async function processPollingUpdate(update) {
  const metadata = extractUpdateMetadata(update);
  const rateLimit = evaluateWebhookRateLimit({
    ipAddress: POLLING_SOURCE_IP,
    chatId: metadata.chatId
  });

  if (!rateLimit.allowed) {
    await auditWebhookRateLimited({
      ipAddress: POLLING_SOURCE_IP,
      chatId: metadata.chatId,
      reason: `polling_${rateLimit.scope || "rate_limited"}`,
      retryAfterSeconds: Math.max(1, Number(rateLimit.retryAfterSeconds || 1)),
      reqContext: {
        ip: POLLING_SOURCE_IP,
        headers: {
          "user-agent": "telegram-polling"
        }
      }
    });
    return { ok: false, skipped: true, reason: "rate_limited" };
  }

  return processTelegramUpdate(update, {
    ip: POLLING_SOURCE_IP,
    userAgent: "telegram-polling",
    source: "polling"
  });
}

async function pollTelegramOnce() {
  if (!isTelegramPollingConfigured()) {
    return { ok: false, skipped: true, reason: "polling_disabled" };
  }

  await ensureWebhookDeletedForPolling();

  if (!pollingState.lastOffset) {
    pollingState.lastOffset = await loadPollingOffset();
  }

  const apiResult = await telegramApiRequest(
    "getUpdates",
    buildGetUpdatesPayload(pollingState.lastOffset),
    {
      timeoutMs: (getPollingTimeoutSeconds() + 10) * 1000
    }
  );
  if (!apiResult.ok) {
    throw new Error(apiResult.error || "telegram_get_updates_failed");
  }

  const updates = Array.isArray(apiResult.data) ? apiResult.data : [];
  let nextOffset = pollingState.lastOffset;
  let processed = 0;

  for (const update of updates) {
    const updateId = normalizeOffset(Number(update?.update_id) + 1);
    if (updateId && (!nextOffset || updateId > nextOffset)) {
      nextOffset = updateId;
    }

    const result = await processPollingUpdate(update);
    if (result?.ok) {
      processed += 1;
    }
  }

  if (nextOffset && nextOffset !== pollingState.lastOffset) {
    pollingState.lastOffset = nextOffset;
    await savePollingOffset(nextOffset);
  }

  return {
    ok: true,
    received: updates.length,
    processed,
    offset: pollingState.lastOffset
  };
}

function scheduleNextPollingCycle(delayMs) {
  if (!pollingState.running || pollingState.stopping) {
    return;
  }

  if (pollingState.timer) {
    clearTimeout(pollingState.timer);
  }

  pollingState.timer = setTimeout(runPollingCycle, Math.max(0, delayMs));
  if (typeof pollingState.timer.unref === "function") {
    pollingState.timer.unref();
  }
}

async function runPollingCycle() {
  if (!pollingState.running || pollingState.stopping || pollingState.inFlight) {
    return;
  }

  pollingState.inFlight = true;
  try {
    const result = await pollTelegramOnce();
    pollingState.backoffMs = 0;
    if (result?.received > 0) {
      logger.info(
        {
          received: result.received,
          processed: result.processed,
          offset: result.offset
        },
        "Updates de Telegram procesados por polling"
      );
    }
  } catch (error) {
    pollingState.backoffMs = pollingState.backoffMs
      ? Math.min(MAX_BACKOFF_MS, pollingState.backoffMs * 2)
      : 2000;
    logger.warn(
      {
        err: error,
        retryInMs: pollingState.backoffMs
      },
      "Fallo en polling de Telegram; se reintentara con backoff"
    );
  } finally {
    pollingState.inFlight = false;
    const nextDelay = getPollingIntervalMs() + pollingState.backoffMs;
    scheduleNextPollingCycle(nextDelay);
  }
}

function startTelegramPolling() {
  if (!isTelegramPollingConfigured()) {
    return { started: false, reason: "polling_disabled" };
  }

  if (pollingState.running) {
    return { started: false, reason: "already_running" };
  }

  pollingState.running = true;
  pollingState.stopping = false;
  pollingState.inFlight = false;
  pollingState.backoffMs = 0;
  pollingState.webhookDeleted = false;
  scheduleNextPollingCycle(0);

  logger.info(
    {
      timeoutSeconds: getPollingTimeoutSeconds(),
      intervalMs: getPollingIntervalMs(),
      allowedUpdates: getPollingAllowedUpdates()
    },
    "Polling interactivo de Telegram iniciado"
  );

  return { started: true };
}

function stopTelegramPolling() {
  if (!pollingState.running) {
    return { stopped: false, reason: "not_running" };
  }

  pollingState.stopping = true;
  pollingState.running = false;
  if (pollingState.timer) {
    clearTimeout(pollingState.timer);
    pollingState.timer = null;
  }

  logger.info("Polling interactivo de Telegram detenido");
  return { stopped: true };
}

module.exports = {
  buildGetUpdatesPayload,
  getPollingAllowedUpdates,
  isTelegramPollingConfigured,
  pollTelegramOnce,
  startTelegramPolling,
  stopTelegramPolling
};
