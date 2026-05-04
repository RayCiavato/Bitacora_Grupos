const crypto = require("crypto");
const { z } = require("zod");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const { createAuditLog } = require("./audit");
const {
  resolveActorId,
  getBitacoraViewScope
} = require("./authorization");
const {
  listTasks,
  getTaskByIdForUser,
  getTaskDashboardSummary,
  getTaskOperationalAlerts
} = require("./tasks");

const APP_TIMEZONE = "America/Caracas";
const MENU_CALLBACK_PREFIX = "menu:";
const LINK_TOKEN_TTL_MINUTES = 15;
const MAX_TELEGRAM_MESSAGE_LENGTH = 3500;
const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const WEBHOOK_IP_LIMIT_PER_MINUTE = Math.max(
  0,
  Number(config.telegramWebhookIpLimitPerMinute || 60)
);
const WEBHOOK_CHAT_LIMIT_PER_MINUTE = Math.max(
  0,
  Number(config.telegramWebhookChatLimitPerMinute || 20)
);
const USER_COMMAND_COOLDOWN_MS = Math.max(
  0,
  Number(config.telegramUserCooldownMs || 2500)
);
const USER_COMMAND_LIMIT_PER_MINUTE = Math.max(
  0,
  Number(config.telegramUserLimitPerMinute || 30)
);
const USER_LIMIT_NOTIFY_MIN_INTERVAL_MS = 15000;
const LINK_SESSION_TTL_MINUTES = Math.max(
  0,
  Number(config.telegramLinkSessionTtlMinutes || 0)
);
const TELEGRAM_AUDIT_ENTITY = "telegram";
const MAX_AUDIT_QUERY_LENGTH = 80;

const webhookRateState = {
  byIp: new Map(),
  byChat: new Map()
};
const userThrottleState = new Map();

const telegramChatSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    type: z.string().optional()
  })
  .passthrough();

const telegramFromSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    username: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
  })
  .passthrough();

const telegramMessageSchema = z
  .object({
    message_id: z.union([z.number(), z.string()]).optional(),
    text: z.string().optional(),
    chat: telegramChatSchema,
    from: telegramFromSchema
  })
  .passthrough();

const telegramCallbackSchema = z
  .object({
    id: z.string().min(1),
    data: z.string().optional(),
    from: telegramFromSchema,
    message: z
      .object({
        message_id: z.union([z.number(), z.string()]).optional(),
        chat: telegramChatSchema
      })
      .passthrough()
      .optional()
  })
  .passthrough();

const telegramUpdateSchema = z
  .object({
    update_id: z.union([z.number(), z.string()]).optional(),
    message: telegramMessageSchema.optional(),
    callback_query: telegramCallbackSchema.optional()
  })
  .passthrough();

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const STATUS_LABELS = Object.freeze({
  sin_realizar: "Sin realizar",
  en_proceso: "En proceso",
  pendiente_revision: "Pendiente revision",
  completada: "Completada",
  cancelada: "Cancelada"
});

const PRIORITY_LABELS = Object.freeze({
  alta: "Alta",
  media: "Media",
  baja: "Baja"
});

function isTelegramInteractiveEnabled() {
  return Boolean(
    config.telegramEnabled &&
      config.telegramBotToken &&
      config.telegramBotInteractiveEnabled
  );
}

function getTelegramBotMode() {
  return config.telegramBotMode === "polling" ? "polling" : "webhook";
}

function isTelegramWebhookModeEnabled() {
  return Boolean(
    isTelegramInteractiveEnabled() &&
      getTelegramBotMode() === "webhook" &&
      config.telegramBotWebhookSecret
  );
}

function isTelegramPollingModeEnabled() {
  return Boolean(isTelegramInteractiveEnabled() && getTelegramBotMode() === "polling");
}

function parseConfiguredChatIds() {
  const list = Array.isArray(config.telegramChatIds)
    ? config.telegramChatIds
    : String(config.telegramChatIds || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  if (list.length > 0) {
    return Array.from(
      new Set(
        list
          .map((item) => normalizeTelegramChatId(item))
          .filter(Boolean)
      )
    );
  }
  const legacy = normalizeTelegramChatId(config.telegramChatId);
  return legacy ? [legacy] : [];
}

function getAllowedGroupChatIds() {
  return parseConfiguredChatIds();
}

function getLinkSessionTtlMinutes() {
  return LINK_SESSION_TTL_MINUTES;
}

function normalizeText(value, fallback = "-", maxLength = 220) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 3))}...`;
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

  return `${normalized.slice(0, Math.max(1, maxLength - 3))}...`;
}

function normalizeTelegramChatId(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  return raw;
}

function isAllowedGroupChat(chat) {
  const type = String(chat?.type || "").toLowerCase();
  if (type !== "group" && type !== "supergroup") {
    return true;
  }
  const configuredList = getAllowedGroupChatIds();
  if (!configuredList.length) {
    return true;
  }
  const normalizedChatId = normalizeTelegramChatId(chat?.id);
  return configuredList.includes(normalizedChatId);
}

function parseCommand(text) {
  const normalized = String(text || "").trim();
  if (!normalized.startsWith("/")) {
    return null;
  }

  const [firstToken = ""] = normalized.split(/\s+/, 1);
  const command = firstToken.replace(/^\//, "").split("@")[0].toLowerCase();
  const args = normalized.slice(firstToken.length).trim();

  return {
    command,
    args
  };
}

function sanitizeSearchQuery(value) {
  return normalizeText(String(value || ""), "", MAX_AUDIT_QUERY_LENGTH);
}

function parseTelegramWebhookPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const parsed = telegramUpdateSchema.safeParse(source);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_payload",
      issues: parsed.error.issues
    };
  }

  return {
    ok: true,
    data: parsed.data
  };
}

function extractUpdateChatId(update) {
  const chatId =
    update?.message?.chat?.id ??
    update?.callback_query?.message?.chat?.id ??
    null;
  return normalizeTelegramChatId(chatId);
}

function extractUpdateTelegramUserId(update) {
  const userId =
    update?.message?.from?.id ??
    update?.callback_query?.from?.id ??
    null;
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return null;
  }
  return numericUserId;
}

function extractUpdateMetadata(update) {
  return {
    chatId: extractUpdateChatId(update),
    telegramUserId: extractUpdateTelegramUserId(update)
  };
}

function cleanupRateMap(map, windowMs, nowTs = Date.now()) {
  if (!(map instanceof Map) || map.size === 0) {
    return;
  }
  for (const [key, state] of map.entries()) {
    if (!state || nowTs - Number(state.windowStart || 0) > windowMs * 2) {
      map.delete(key);
    }
  }
}

function consumeWindowQuota(map, key, limit, windowMs, nowTs = Date.now()) {
  if (!limit || limit <= 0 || !key) {
    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  const current = map.get(key);
  if (!current || nowTs - Number(current.windowStart || 0) >= windowMs) {
    map.set(key, {
      windowStart: nowTs,
      count: 1
    });
    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  if (current.count >= limit) {
    const retryAfterMs = Math.max(1, windowMs - (nowTs - current.windowStart));
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
    };
  }

  current.count += 1;
  map.set(key, current);
  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}

function evaluateWebhookRateLimit({ ipAddress, chatId }) {
  const nowTs = Date.now();
  cleanupRateMap(webhookRateState.byIp, RATE_LIMIT_WINDOW_MS, nowTs);
  cleanupRateMap(webhookRateState.byChat, RATE_LIMIT_WINDOW_MS, nowTs);

  const normalizedIp = String(ipAddress || "").trim();
  const normalizedChatId = normalizeTelegramChatId(chatId);

  const byIp = consumeWindowQuota(
    webhookRateState.byIp,
    normalizedIp,
    WEBHOOK_IP_LIMIT_PER_MINUTE,
    RATE_LIMIT_WINDOW_MS,
    nowTs
  );
  if (!byIp.allowed) {
    return {
      allowed: false,
      scope: "ip",
      retryAfterSeconds: byIp.retryAfterSeconds
    };
  }

  const byChat = consumeWindowQuota(
    webhookRateState.byChat,
    normalizedChatId,
    WEBHOOK_CHAT_LIMIT_PER_MINUTE,
    RATE_LIMIT_WINDOW_MS,
    nowTs
  );
  if (!byChat.allowed) {
    return {
      allowed: false,
      scope: "chat",
      retryAfterSeconds: byChat.retryAfterSeconds
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}

function evaluateUserThrottle(telegramUserId) {
  const normalizedUserId = Number(telegramUserId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return {
      allowed: true
    };
  }

  const nowTs = Date.now();
  const state = userThrottleState.get(normalizedUserId) || {
    windowStart: nowTs,
    countInWindow: 0,
    lastCommandAt: 0,
    lastWarnAt: 0
  };

  if (nowTs - state.windowStart >= RATE_LIMIT_WINDOW_MS) {
    state.windowStart = nowTs;
    state.countInWindow = 0;
  }

  const cooldownBlocked =
    USER_COMMAND_COOLDOWN_MS > 0 &&
    state.lastCommandAt > 0 &&
    nowTs - state.lastCommandAt < USER_COMMAND_COOLDOWN_MS;
  if (cooldownBlocked) {
    const shouldNotify = nowTs - state.lastWarnAt >= USER_LIMIT_NOTIFY_MIN_INTERVAL_MS;
    if (shouldNotify) {
      state.lastWarnAt = nowTs;
    }
    userThrottleState.set(normalizedUserId, state);
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterSeconds: Math.ceil(
        (USER_COMMAND_COOLDOWN_MS - (nowTs - state.lastCommandAt)) / 1000
      ),
      shouldNotify
    };
  }

  if (
    USER_COMMAND_LIMIT_PER_MINUTE > 0 &&
    state.countInWindow >= USER_COMMAND_LIMIT_PER_MINUTE
  ) {
    const shouldNotify = nowTs - state.lastWarnAt >= USER_LIMIT_NOTIFY_MIN_INTERVAL_MS;
    if (shouldNotify) {
      state.lastWarnAt = nowTs;
    }
    userThrottleState.set(normalizedUserId, state);
    return {
      allowed: false,
      reason: "minute_limit",
      retryAfterSeconds: Math.ceil(
        Math.max(1, RATE_LIMIT_WINDOW_MS - (nowTs - state.windowStart)) / 1000
      ),
      shouldNotify
    };
  }

  state.lastCommandAt = nowTs;
  state.countInWindow += 1;
  userThrottleState.set(normalizedUserId, state);
  return {
    allowed: true
  };
}

function cleanupUserThrottleState() {
  if (userThrottleState.size === 0) {
    return;
  }
  const nowTs = Date.now();
  for (const [key, state] of userThrottleState.entries()) {
    if (!state || nowTs - Number(state.lastCommandAt || 0) > RATE_LIMIT_WINDOW_MS * 3) {
      userThrottleState.delete(key);
    }
  }
}

function createTelegramReqContext(context = {}) {
  const ip = String(context.ip || context.ipAddress || "").trim() || null;
  const userAgent = String(context.userAgent || "").trim() || "telegram-bot-webhook";
  return {
    ip,
    headers: {
      "user-agent": userAgent
    }
  };
}

function createTelegramMetadata({
  chatId = null,
  telegramUserId = null,
  command = null,
  action = null,
  result = "success",
  reason = null,
  details = null
} = {}) {
  const metadata = {
    channel: "telegram",
    result: normalizeText(result, "success", 24)
  };
  if (chatId) {
    metadata.chatId = String(chatId);
  }
  if (telegramUserId) {
    metadata.telegramUserId = Number(telegramUserId);
  }
  if (command) {
    metadata.command = normalizeText(command, "", 60);
  }
  if (action) {
    metadata.action = normalizeText(action, "", 80);
  }
  if (reason) {
    metadata.reason = normalizeText(reason, "", 120);
  }
  if (details && typeof details === "object" && !Array.isArray(details)) {
    metadata.details = details;
  }
  return metadata;
}

async function auditTelegramAction({
  userId = null,
  chatId = null,
  telegramUserId = null,
  auditAction = "telegram.action",
  command = null,
  action = null,
  result = "success",
  reason = null,
  details = null,
  reqContext = null
} = {}) {
  await createAuditLog({
    userId,
    action: auditAction,
    entity: TELEGRAM_AUDIT_ENTITY,
    entityId: null,
    metadata: createTelegramMetadata({
      chatId,
      telegramUserId,
      command,
      action,
      result,
      reason,
      details
    }),
    req: reqContext || undefined
  });
}

async function auditWebhookRateLimited({
  ipAddress = null,
  chatId = null,
  reason = "rate_limited",
  retryAfterSeconds = 0,
  reqContext = null
} = {}) {
  await auditTelegramAction({
    userId: null,
    chatId,
    telegramUserId: null,
    auditAction: "telegram.webhook.rate_limited",
    action: "webhook",
    result: "fail",
    reason,
    details: {
      retryAfterSeconds: Math.max(0, Number(retryAfterSeconds) || 0),
      ipAddress: normalizeText(String(ipAddress || ""), "", 80) || null
    },
    reqContext
  });
}

async function auditWebhookInvalidPayload({
  ipAddress = null,
  chatId = null,
  reqContext = null
} = {}) {
  await auditTelegramAction({
    userId: null,
    chatId,
    telegramUserId: null,
    auditAction: "telegram.webhook.invalid_payload",
    action: "webhook",
    result: "fail",
    reason: "invalid_payload",
    details: {
      ipAddress: normalizeText(String(ipAddress || ""), "", 80) || null
    },
    reqContext
  });
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
  if (!value) {
    return "-";
  }
  const parsedDate = parseDateOnlyAsCaracas(value);
  if (parsedDate) {
    return DATE_ONLY_FORMATTER.format(parsedDate);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return normalizeText(value);
  }
  return DATE_ONLY_FORMATTER.format(parsed);
}

function toTaskLine(task) {
  const title = normalizeText(task?.title, "Sin titulo", 90);
  const status = STATUS_LABELS[String(task?.status || "")] || normalizeText(task?.status, "-", 24);
  const priority = PRIORITY_LABELS[String(task?.priority || "")] || normalizeText(task?.priority, "-", 24);
  const dueDate = formatDateCaracas(task?.dueDate);
  return `- #${Number(task?.id || 0)} ${title}\n  Estado: ${status} | Prioridad: ${priority} | Vence: ${dueDate}`;
}

function splitMessageChunks(text) {
  const normalized = String(text || "").trim();
  if (normalized.length <= MAX_TELEGRAM_MESSAGE_LENGTH) {
    return [normalized];
  }

  const lines = normalized.split("\n");
  const chunks = [];
  let current = "";
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= MAX_TELEGRAM_MESSAGE_LENGTH) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (line.length <= MAX_TELEGRAM_MESSAGE_LENGTH) {
      current = line;
      continue;
    }

    for (let index = 0; index < line.length; index += MAX_TELEGRAM_MESSAGE_LENGTH) {
      chunks.push(line.slice(index, index + MAX_TELEGRAM_MESSAGE_LENGTH));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [normalized.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH)];
}

function buildMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Mis Tareas", callback_data: `${MENU_CALLBACK_PREFIX}tasks` },
        { text: "Alertas", callback_data: `${MENU_CALLBACK_PREFIX}alerts` }
      ],
      [
        { text: "Bitacoras", callback_data: `${MENU_CALLBACK_PREFIX}bitacoras` },
        { text: "Buscar tarea", callback_data: `${MENU_CALLBACK_PREFIX}search` }
      ],
      [
        { text: "Estado general", callback_data: `${MENU_CALLBACK_PREFIX}status` }
      ]
    ]
  };
}

function buildBackMenuKeyboard() {
  return {
    inline_keyboard: [[{ text: "Volver al menu", callback_data: `${MENU_CALLBACK_PREFIX}home` }]]
  };
}

async function telegramApiRequest(method, payload, options = {}) {
  if (!config.telegramBotToken) {
    return { ok: false, error: "telegram_bot_token_missing" };
  }

  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(1000, Number(options.timeoutMs))
    : 9000;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });

    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }

    if (!response.ok || !body?.ok) {
      const reason = body?.description || `HTTP ${response.status}`;
      return {
        ok: false,
        error: `telegram_api_error:${reason}`,
        statusCode: response.status
      };
    }

    return {
      ok: true,
      data: body?.result || null
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "AbortError" ? "telegram_api_timeout" : "telegram_api_network_error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendTelegramMessage(chatId, text, options = {}) {
  const normalizedChatId = normalizeTelegramChatId(chatId);
  if (!normalizedChatId) {
    return { ok: false, error: "telegram_chat_id_missing" };
  }

  return telegramApiRequest("sendMessage", {
    chat_id: normalizedChatId,
    text: sanitizeTelegramMessage(text, "-", 3900),
    disable_web_page_preview: options.disableWebPagePreview !== false,
    reply_markup: options.replyMarkup || undefined,
    reply_to_message_id: options.replyToMessageId || undefined
  });
}

async function sendTelegramMessageChunked(chatId, text, options = {}) {
  const chunks = splitMessageChunks(text);
  let lastResult = { ok: true };
  for (let index = 0; index < chunks.length; index += 1) {
    const isLast = index === chunks.length - 1;
    lastResult = await sendTelegramMessage(chatId, chunks[index], {
      ...options,
      replyMarkup: isLast ? options.replyMarkup : undefined,
      replyToMessageId: isLast ? options.replyToMessageId : undefined
    });
    if (!lastResult.ok) {
      return lastResult;
    }
  }
  return lastResult;
}

async function answerCallbackQuery(callbackQueryId, text = null) {
  if (!callbackQueryId) {
    return { ok: false, error: "callback_query_id_missing" };
  }

  return telegramApiRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text ? normalizeText(text, "", 120) : undefined,
    show_alert: false
  });
}

function timingSafeEqualString(left, right) {
  const leftValue = String(left || "");
  const rightValue = String(right || "");
  const leftBuffer = Buffer.from(leftValue);
  const rightBuffer = Buffer.from(rightValue);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isTelegramWebhookAuthorized(req) {
  const expectedSecret = String(config.telegramBotWebhookSecret || "").trim();
  if (!expectedSecret) {
    return false;
  }

  const providedSecret = String(req.headers["x-telegram-bot-api-secret-token"] || "").trim();
  if (!providedSecret) {
    return false;
  }

  return timingSafeEqualString(providedSecret, expectedSecret);
}

function hashLinkCode(rawCode) {
  return crypto.createHash("sha256").update(String(rawCode || "")).digest("hex");
}

function normalizeLinkCode(rawCode) {
  return String(rawCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function generateLinkCode(length = 10) {
  const safeLength = Math.max(8, Math.min(Number(length || 10), 18));
  const random = crypto.randomBytes(safeLength * 2);
  let output = "";
  for (let index = 0; index < random.length && output.length < safeLength; index += 1) {
    output += LINK_CODE_ALPHABET[random[index] % LINK_CODE_ALPHABET.length];
  }
  if (output.length !== safeLength) {
    output = output.padEnd(safeLength, "A");
  }
  if (safeLength === 10) {
    return `${output.slice(0, 5)}-${output.slice(5)}`;
  }
  return output;
}

async function issueTelegramLinkToken({ user, req } = {}) {
  const userId = resolveActorId(user);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("invalid_actor");
  }

  let created = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const rawCode = generateLinkCode(10);
    const normalizedCode = normalizeLinkCode(rawCode);
    const tokenHash = hashLinkCode(normalizedCode);

    try {
      const result = await pool.query(
        `
          INSERT INTO telegram_link_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, NOW() + ($3::int * interval '1 minute'))
          RETURNING id, expires_at AS "expiresAt"
        `,
        [userId, tokenHash, LINK_TOKEN_TTL_MINUTES]
      );

      created = {
        id: result.rows[0]?.id || null,
        code: rawCode,
        expiresAt: result.rows[0]?.expiresAt || null
      };
      break;
    } catch (error) {
      if (String(error?.code || "") !== "23505") {
        throw error;
      }
    }
  }

  if (!created) {
    throw new Error("telegram_link_token_generation_failed");
  }

  await createAuditLog({
    userId,
    action: "telegram.link_token_created",
    entity: "user",
    entityId: userId,
    metadata: {
      expiresAt: created.expiresAt
    },
    req
  });

  return created;
}

async function getLinkedUserByTelegramUserId(telegramUserId) {
  const normalizedId = Number(telegramUserId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        l.telegram_user_id AS "telegramUserId",
        l.telegram_username AS "telegramUsername",
        l.telegram_private_chat_id AS "telegramPrivateChatId",
        l.telegram_group_chat_id AS "telegramGroupChatId",
        l.last_used_at AS "lastUsedAt",
        l.session_expires_at AS "sessionExpiresAt"
      FROM user_telegram_links l
      JOIN users u ON u.id = l.user_id
      WHERE l.telegram_user_id = $1
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
        AND (l.session_expires_at IS NULL OR l.session_expires_at > NOW())
      LIMIT 1
    `,
    [normalizedId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: Number(row.id),
    sub: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    telegram: {
      telegramUserId: Number(row.telegramUserId),
      telegramUsername: row.telegramUsername || "",
      telegramPrivateChatId: row.telegramPrivateChatId ? String(row.telegramPrivateChatId) : "",
      telegramGroupChatId: row.telegramGroupChatId ? String(row.telegramGroupChatId) : "",
      lastUsedAt: row.lastUsedAt || null,
      sessionExpiresAt: row.sessionExpiresAt || null
    }
  };
}

async function clearExpiredTelegramLinkByTelegramUserId(telegramUserId) {
  const normalizedId = Number(telegramUserId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const result = await pool.query(
    `
      DELETE FROM user_telegram_links
      WHERE telegram_user_id = $1
        AND session_expires_at IS NOT NULL
        AND session_expires_at <= NOW()
      RETURNING user_id AS "userId"
    `,
    [normalizedId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const userId = Number(result.rows[0]?.userId || 0) || null;
  return userId;
}

async function getTelegramLinkStatus(user) {
  const userId = resolveActorId(user);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { linked: false };
  }

  const result = await pool.query(
    `
      SELECT
        telegram_user_id AS "telegramUserId",
        telegram_username AS "telegramUsername",
        telegram_private_chat_id AS "telegramPrivateChatId",
        telegram_group_chat_id AS "telegramGroupChatId",
        last_used_at AS "lastUsedAt",
        session_expires_at AS "sessionExpiresAt",
        verified_at AS "verifiedAt",
        updated_at AS "updatedAt"
      FROM user_telegram_links
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return { linked: false };
  }

  return {
    linked: true,
    link: result.rows[0]
  };
}

async function unlinkTelegramUser(user, req) {
  const userId = resolveActorId(user);
  if (!Number.isInteger(userId) || userId <= 0) {
    return false;
  }

  const result = await pool.query(
    `
      DELETE FROM user_telegram_links
      WHERE user_id = $1
    `,
    [userId]
  );

  if (result.rowCount > 0) {
    await createAuditLog({
      userId,
      action: "telegram.account_unlinked",
      entity: "user",
      entityId: userId,
      req
    });
  }

  return result.rowCount > 0;
}

async function touchTelegramLinkContext({ userId, from, chat }) {
  const normalizedUserId = Number(userId);
  const telegramUserId = Number(from?.id);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return;
  }
  if (!Number.isInteger(telegramUserId) || telegramUserId <= 0) {
    return;
  }

  const username = normalizeText(from?.username || "", "", 64);
  const firstName = normalizeText(from?.first_name || "", "", 120);
  const lastName = normalizeText(from?.last_name || "", "", 120);
  const chatId = normalizeTelegramChatId(chat?.id);
  const chatType = String(chat?.type || "").toLowerCase();
  const privateChatId = chatType === "private" ? chatId : null;
  const groupChatId = chatType === "group" || chatType === "supergroup" ? chatId : null;
  const sessionTtlMinutes = getLinkSessionTtlMinutes();

  await pool.query(
    `
      UPDATE user_telegram_links
      SET
        telegram_username = CASE WHEN $2 = '' THEN telegram_username ELSE $2 END,
        telegram_first_name = CASE WHEN $3 = '' THEN telegram_first_name ELSE $3 END,
        telegram_last_name = CASE WHEN $4 = '' THEN telegram_last_name ELSE $4 END,
        telegram_private_chat_id = COALESCE($5, telegram_private_chat_id),
        telegram_group_chat_id = COALESCE($6, telegram_group_chat_id),
        last_used_at = NOW(),
        session_expires_at = CASE
          WHEN $7::int > 0 THEN NOW() + ($7::int * interval '1 minute')
          ELSE session_expires_at
        END,
        updated_at = NOW()
      WHERE user_id = $1
    `,
    [normalizedUserId, username, firstName, lastName, privateChatId, groupChatId, sessionTtlMinutes]
  );
}

async function consumeTelegramLinkCode({ code, from, chat, reqMeta = null } = {}) {
  const normalizedCode = normalizeLinkCode(code);
  if (!normalizedCode || normalizedCode.length < 8) {
    return { ok: false, error: "invalid_code" };
  }

  const tokenHash = hashLinkCode(normalizedCode);
  const telegramUserId = Number(from?.id);
  if (!Number.isInteger(telegramUserId) || telegramUserId <= 0) {
    return { ok: false, error: "invalid_telegram_user" };
  }

  const username = normalizeText(from?.username || "", "", 64);
  const firstName = normalizeText(from?.first_name || "", "", 120);
  const lastName = normalizeText(from?.last_name || "", "", 120);
  const chatId = normalizeTelegramChatId(chat?.id);
  const chatType = String(chat?.type || "").toLowerCase();
  const privateChatId = chatType === "private" ? chatId : null;
  const groupChatId = chatType === "group" || chatType === "supergroup" ? chatId : null;
  const sessionTtlMinutes = getLinkSessionTtlMinutes();

  let client = null;
  let txStarted = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    txStarted = true;

    const tokenResult = await client.query(
      `
        SELECT
          t.id,
          t.user_id AS "userId",
          t.expires_at AS "expiresAt",
          u.is_active AS "isActive",
          u.deleted_at AS "deletedAt"
        FROM telegram_link_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1
          AND t.consumed_at IS NULL
        ORDER BY t.created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      await client.query("ROLLBACK");
      txStarted = false;
      return { ok: false, error: "invalid_code" };
    }

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow.isActive || tokenRow.deletedAt) {
      await client.query("ROLLBACK");
      txStarted = false;
      return { ok: false, error: "user_inactive" };
    }

    if (!tokenRow.expiresAt || new Date(tokenRow.expiresAt).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      txStarted = false;
      return { ok: false, error: "expired_code" };
    }

    await client.query(
      `
        UPDATE telegram_link_tokens
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [tokenRow.id]
    );

    await client.query(
      `
        DELETE FROM user_telegram_links
        WHERE user_id = $1
           OR telegram_user_id = $2
      `,
      [tokenRow.userId, telegramUserId]
    );

    await client.query(
      `
        INSERT INTO user_telegram_links (
          user_id,
          telegram_user_id,
          telegram_username,
          telegram_first_name,
          telegram_last_name,
          telegram_private_chat_id,
          telegram_group_chat_id,
          last_used_at,
          session_expires_at,
          verified_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          CASE
            WHEN $8::int > 0 THEN NOW() + ($8::int * interval '1 minute')
            ELSE NULL
          END,
          NOW()
        )
      `,
      [
        tokenRow.userId,
        telegramUserId,
        username || null,
        firstName || null,
        lastName || null,
        privateChatId,
        groupChatId,
        sessionTtlMinutes
      ]
    );

    await client.query("COMMIT");
    txStarted = false;

    await createAuditLog({
      userId: tokenRow.userId,
      action: "telegram.account_linked",
      entity: "user",
      entityId: tokenRow.userId,
      metadata: {
        telegramUserId,
        telegramUsername: username || null
      },
      req: reqMeta || undefined
    });

    return { ok: true, userId: Number(tokenRow.userId) };
  } catch (error) {
    if (client && txStarted) {
      await client.query("ROLLBACK");
    }
    logger.warn({ err: error }, "No se pudo vincular cuenta de Telegram");
    return { ok: false, error: "link_failed" };
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function listRecentBitacorasForUser(user, limit = 5) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 5), 10));
  const scope = getBitacoraViewScope(user);
  const params = [];
  const whereParts = [];

  if (!scope.canViewAny) {
    const actorId = resolveActorId(user);
    if (!scope.canViewOwnCreated || !Number.isInteger(actorId) || actorId <= 0) {
      return [];
    }
    const actorIndex = params.push(actorId);
    whereParts.push(`e.encargado_id = $${actorIndex}`);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const limitIndex = params.push(safeLimit);
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.fecha,
        e.prioridad,
        e.descripcion_actividad AS "actividad",
        CASE
          WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
            THEN CONCAT(u.name, ' (Usuario inactivo)')
          ELSE u.name
        END AS "encargado"
      FROM events e
      JOIN users u ON u.id = e.encargado_id
      ${whereSql}
      ORDER BY e.fecha DESC, e.created_at DESC
      LIMIT $${limitIndex}
    `,
    params
  );

  return result.rows;
}

async function getBitacoraTotalsForUser(user) {
  const scope = getBitacoraViewScope(user);
  const params = [];
  const whereParts = [];

  if (!scope.canViewAny) {
    const actorId = resolveActorId(user);
    if (!scope.canViewOwnCreated || !Number.isInteger(actorId) || actorId <= 0) {
      return {
        total: 0,
        today: 0,
        critical: 0
      };
    }
    const actorIndex = params.push(actorId);
    whereParts.push(`encargado_id = $${actorIndex}`);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE fecha = CURRENT_DATE)::int AS today,
        COUNT(*) FILTER (
          WHERE prioridad = 'alta'
            AND fecha >= CURRENT_DATE - INTERVAL '6 day'
        )::int AS critical
      FROM events
      ${whereSql}
    `,
    params
  );

  const row = result.rows[0] || {};
  return {
    total: Number(row.total || 0),
    today: Number(row.today || 0),
    critical: Number(row.critical || 0)
  };
}

async function buildMyTasksMessage(user) {
  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return "No se pudo identificar tu cuenta para consultar tareas.";
  }

  const result = await listTasks({
    user,
    query: {
      assignedToId: actorId,
      sortBy: "dueDate",
      sortOrder: "asc",
      page: 1,
      pageSize: 5
    }
  });

  const items = Array.isArray(result?.items) ? result.items : [];
  if (items.length === 0) {
    return [
    "Mis Tareas",
      "",
      "No tienes tareas asignadas en este momento."
    ].join("\n");
  }

  const total = Number(result?.pagination?.totalItems || items.length);
  const lines = items.map((item) => toTaskLine(item));
  const moreNotice = total > items.length ? `\nMostrando ${items.length} de ${total} tareas.` : "";
  return [
    "Mis Tareas",
    "",
    ...lines,
    moreNotice
  ]
    .join("\n")
    .trim();
}

async function buildAlertsMessage(user) {
  const alerts = await getTaskOperationalAlerts({
    user,
    dueSoonDays: 7
  });
  const counts = alerts.counts || {};

  return [
    "Alertas operativas",
    "",
    `- Vencidas: ${Number(counts.overdue || 0)}`,
    `- Proximas a vencer (7 dias): ${Number(counts.dueSoon || 0)}`,
    `- Criticas: ${Number(counts.critical || 0)}`,
    `- Prioridad alta: ${Number(counts.high || 0)}`,
    `- Prioridad media: ${Number(counts.medium || 0)}`,
    `- Prioridad baja: ${Number(counts.low || 0)}`
  ].join("\n");
}

async function buildBitacorasMessage(user) {
  const scope = getBitacoraViewScope(user);
  if (!scope.canViewAny && !scope.canViewOwnCreated) {
    return "No tienes permisos para ver esta informacion.";
  }

  const items = await listRecentBitacorasForUser(user, 5);
  if (!items.length) {
    return [
    "Bitacoras recientes",
      "",
      "No hay bitacoras visibles para tu perfil."
    ].join("\n");
  }

  const lines = items.map((item) => {
    const activity = normalizeText(item.actividad, "-", 90);
    return `- #${Number(item.id || 0)} ${activity}\n  Usuario: ${normalizeText(item.encargado, "-", 60)} | Fecha: ${formatDateCaracas(item.fecha)}`;
  });

  return [
    "Bitacoras recientes",
    "",
    ...lines
  ].join("\n");
}

async function buildGeneralStatusMessage(user) {
  const [taskSummary, taskAlerts, bitacoraTotals] = await Promise.all([
    getTaskDashboardSummary({
      user,
      dueSoonDays: 7,
      recentLimit: 3
    }),
    getTaskOperationalAlerts({
      user,
      dueSoonDays: 7
    }),
    getBitacoraTotalsForUser(user)
  ]);

  const totals = taskSummary?.totals || {};
  const pending =
    Number(totals.sinRealizar || 0) +
    Number(totals.enProceso || 0) +
    Number(totals.pendienteRevision || 0);
  const alerts = taskAlerts?.counts || {};

  return [
    "Estado general",
    "",
    "Tareas:",
    `- Total: ${Number(totals.total || 0)}`,
    `- Pendientes: ${pending}`,
    `- Completadas: ${Number(totals.completada || 0)}`,
    `- Vencidas: ${Number(totals.vencidas || 0)}`,
    `- Criticas activas: ${Number(alerts.critical || 0)}`,
    "",
    "Bitacoras:",
    `- Total: ${Number(bitacoraTotals.total || 0)}`,
    `- Hoy: ${Number(bitacoraTotals.today || 0)}`,
    `- Criticas (7 dias): ${Number(bitacoraTotals.critical || 0)}`
  ].join("\n");
}

async function buildTaskSearchMessage(user, rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) {
    return "Uso: /buscar <id o texto>";
  }

  if (/^\d+$/.test(query)) {
    const task = await getTaskByIdForUser(Number(query), user);
    if (!task) {
      return "No se encontro la tarea solicitada.";
    }
    return [
      "Resultado de busqueda",
      "",
      toTaskLine(task)
    ].join("\n");
  }

  const result = await listTasks({
    user,
    query: {
      q: query,
      sortBy: "updatedAt",
      sortOrder: "desc",
      page: 1,
      pageSize: 5
    }
  });

  const items = Array.isArray(result?.items) ? result.items : [];
  if (!items.length) {
    return `No se encontraron tareas para "${normalizeText(query, "", 80)}".`;
  }

  const total = Number(result?.pagination?.totalItems || items.length);
  const lines = items.map((item) => toTaskLine(item));
  const moreNotice = total > items.length ? `\nMostrando ${items.length} de ${total} coincidencias.` : "";
  return [
      "Resultado de busqueda",
    "",
    ...lines,
    moreNotice
  ]
    .join("\n")
    .trim();
}

async function sendPanelMenu(chatId) {
  return sendTelegramMessage(chatId, "Panel de Control", {
    replyMarkup: buildMainMenuKeyboard()
  });
}

async function sendUserFriendlyError(chatId, errorCode, options = {}) {
  const messages = {
    user_not_linked: "Tu usuario no esta vinculado. Usa /start para conectarte al sistema.",
    session_expired: "Tu sesion de Telegram expiro. Usa /start para conectarte al sistema.",
    task_not_found: "No se encontro la tarea solicitada.",
    forbidden: "No tienes permisos para ver esta informacion.",
    internal_error: "Ocurrio un error procesando la solicitud. Intenta nuevamente.",
    chat_not_allowed: "Este chat no esta autorizado para usar el panel.",
    soft_throttle: "Espera unos segundos antes de enviar otra solicitud."
  };

  const text = messages[errorCode] || messages.internal_error;
  return sendTelegramMessage(chatId, text, {
    replyToMessageId: options.replyToMessageId || undefined
  });
}

async function resolveLinkedTelegramUserOrNotify({
  from,
  chat,
  replyToMessageId = null,
  reqContext = null,
  command = null,
  actionLabel = null
} = {}) {
  const chatId = normalizeTelegramChatId(chat?.id);
  const telegramUserId = Number(from?.id);
  const linkedUser = await getLinkedUserByTelegramUserId(telegramUserId);
  if (!linkedUser) {
    const expiredUserId = await clearExpiredTelegramLinkByTelegramUserId(telegramUserId);
    if (expiredUserId) {
      await sendUserFriendlyError(chatId, "session_expired", {
        replyToMessageId
      });
      await auditTelegramAction({
        userId: expiredUserId,
        chatId,
        telegramUserId,
        auditAction: "telegram.bot.session_expired",
        command,
        action: actionLabel,
        result: "fail",
        reason: "session_expired",
        reqContext
      });
      return null;
    }

    await sendUserFriendlyError(chatId, "user_not_linked", {
      replyToMessageId
    });
    await auditTelegramAction({
      userId: null,
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.link_missing",
      command,
      action: actionLabel,
      result: "fail",
      reason: "not_linked",
      reqContext
    });
    return null;
  }

  await touchTelegramLinkContext({
    userId: linkedUser.id,
    from,
    chat
  });

  return linkedUser;
}

async function handleStartCommand(update, context = {}) {
  const reqContext = createTelegramReqContext(context);
  const message = update?.message;
  const chat = message?.chat;
  const from = message?.from;
  const parsed = parseCommand(message?.text);
  const args = normalizeText(parsed?.args || "", "", 80);
  const replyToMessageId = message?.message_id || null;
  const chatId = normalizeTelegramChatId(chat?.id);
  const telegramUserId = Number(from?.id);

  if (!chat || !from) {
    return;
  }

  const isPrivate = String(chat.type || "").toLowerCase() === "private";
  if (!isPrivate && !isAllowedGroupChat(chat)) {
    await sendUserFriendlyError(chat.id, "chat_not_allowed", {
      replyToMessageId
    });
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_start",
      command: "/start",
      action: "start",
      result: "fail",
      reason: "chat_not_allowed",
      reqContext
    });
    return;
  }

  if (!args) {
    const linkedUser = await getLinkedUserByTelegramUserId(telegramUserId);
    if (linkedUser) {
      await touchTelegramLinkContext({ userId: linkedUser.id, from, chat });
      await sendTelegramMessage(chat.id, [
        `OK Hola ${normalizeText(linkedUser.name, "equipo", 80)}.`,
        "Tu cuenta ya esta vinculada. Usa /menu para abrir el panel."
      ].join("\n"), {
        replyToMessageId
      });
      await auditTelegramAction({
        userId: linkedUser.id,
        chatId,
        telegramUserId,
        auditAction: "telegram.bot.command_start",
        command: "/start",
        action: "start",
        result: "success",
        reason: "already_linked",
        reqContext
      });
      return;
    }

    const expiredUserId = await clearExpiredTelegramLinkByTelegramUserId(telegramUserId);
    if (expiredUserId) {
      await sendUserFriendlyError(chat.id, "session_expired", {
        replyToMessageId
      });
      await auditTelegramAction({
        userId: expiredUserId,
        chatId,
        telegramUserId,
        auditAction: "telegram.bot.command_start",
        command: "/start",
        action: "start",
        result: "fail",
        reason: "session_expired",
        reqContext
      });
      return;
    }

    await sendUserFriendlyError(chat.id, "user_not_linked", {
      replyToMessageId
    });
    await sendTelegramMessage(chat.id, "Genera un codigo desde la web y ejecuta: /start CODIGO-VINCULACION", {
      replyToMessageId
    });
    await auditTelegramAction({
      userId: null,
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_start",
      command: "/start",
      action: "start",
      result: "fail",
      reason: "not_linked",
      reqContext
    });
    return;
  }

  const linkResult = await consumeTelegramLinkCode({
    code: args,
    from,
    chat,
    reqMeta: reqContext
  });

  if (!linkResult.ok) {
    const reason = linkResult.error === "expired_code"
      ? "El codigo expiro. Genera uno nuevo en el sistema."
      : "Codigo invalido. Verifica el token e intentalo de nuevo.";
    await sendTelegramMessage(chat.id, `ERROR: ${reason}`, {
      replyToMessageId
    });
    await auditTelegramAction({
      userId: null,
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_start",
      command: "/start",
      action: "start_link",
      result: "fail",
      reason: linkResult.error || "link_failed",
      reqContext
    });
    return;
  }

  const linkedUser = await getLinkedUserByTelegramUserId(telegramUserId);
  await sendTelegramMessage(chat.id, [
    `OK Cuenta vinculada correctamente (${normalizeText(linkedUser?.email || "", "usuario", 90)}).`,
    "Ya puedes usar /menu para consultar tareas y bitacoras."
  ].join("\n"), {
    replyToMessageId
  });

  await auditTelegramAction({
    userId: linkResult.userId || linkedUser?.id || null,
    chatId,
    telegramUserId,
    auditAction: "telegram.bot.command_start",
    command: "/start",
    action: "start_link",
    result: "success",
    reason: "linked",
    reqContext
  });
}

async function handleMenuCommand(update, context = {}) {
  const reqContext = createTelegramReqContext(context);
  const message = update?.message;
  const chat = message?.chat;
  const from = message?.from;
  const chatId = normalizeTelegramChatId(chat?.id);
  const telegramUserId = Number(from?.id);
  if (!chat || !from) {
    return;
  }

  if (!isAllowedGroupChat(chat)) {
    await sendUserFriendlyError(chat.id, "chat_not_allowed", {
      replyToMessageId: message?.message_id || null
    });
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_menu",
      command: "/menu",
      action: "menu",
      result: "fail",
      reason: "chat_not_allowed",
      reqContext
    });
    return;
  }

  const linkedUser = await resolveLinkedTelegramUserOrNotify({
    from,
    chat,
    replyToMessageId: message?.message_id || null,
    reqContext,
    command: "/menu",
    actionLabel: "menu"
  });
  if (!linkedUser) {
    return;
  }

  await sendPanelMenu(chat.id);
  await auditTelegramAction({
    userId: linkedUser.id,
    chatId,
    telegramUserId,
    auditAction: "telegram.bot.command_menu",
    command: "/menu",
    action: "menu",
    result: "success",
    reqContext
  });
}

async function handleSearchCommand(update, query, context = {}) {
  const reqContext = createTelegramReqContext(context);
  const message = update?.message;
  const chat = message?.chat;
  const from = message?.from;
  const chatId = normalizeTelegramChatId(chat?.id);
  const telegramUserId = Number(from?.id);
  if (!chat || !from) {
    return;
  }

  if (!isAllowedGroupChat(chat)) {
    await sendUserFriendlyError(chat.id, "chat_not_allowed", {
      replyToMessageId: message?.message_id || null
    });
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_search",
      command: "/buscar",
      action: "search",
      result: "fail",
      reason: "chat_not_allowed",
      reqContext
    });
    return;
  }

  const linkedUser = await resolveLinkedTelegramUserOrNotify({
    from,
    chat,
    replyToMessageId: message?.message_id || null,
    reqContext,
    command: "/buscar",
    actionLabel: "search"
  });
  if (!linkedUser) {
    return;
  }

  const safeQuery = sanitizeSearchQuery(query);
  const text = await buildTaskSearchMessage(linkedUser, safeQuery);
  await sendTelegramMessageChunked(chat.id, text, {
    replyMarkup: buildBackMenuKeyboard()
  });

  await auditTelegramAction({
    userId: linkedUser.id,
    chatId,
    telegramUserId,
    auditAction: "telegram.bot.command_search",
    command: "/buscar",
    action: "search",
    result: "success",
    details: {
      query: safeQuery || null
    },
    reqContext
  });
}

async function handleCallbackQuery(update, context = {}) {
  const reqContext = createTelegramReqContext(context);
  const callback = update?.callback_query;
  const callbackId = callback?.id;
  const data = String(callback?.data || "");
  const chat = callback?.message?.chat;
  const from = callback?.from;
  const chatId = normalizeTelegramChatId(chat?.id);
  const telegramUserId = Number(from?.id);

  if (!callbackId || !data || !chat || !from) {
    return;
  }

  const throttle = evaluateUserThrottle(telegramUserId);
  if (!throttle.allowed) {
    await answerCallbackQuery(callbackId, "Espera unos segundos y vuelve a intentar.");
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.callback",
      action: data.slice(0, 80),
      result: "fail",
      reason: throttle.reason || "throttled",
      details: {
        retryAfterSeconds: Math.max(0, Number(throttle.retryAfterSeconds) || 0)
      },
      reqContext
    });
    return;
  }

  await answerCallbackQuery(callbackId);

  if (!data.startsWith(MENU_CALLBACK_PREFIX)) {
    return;
  }

  if (!isAllowedGroupChat(chat)) {
    await sendUserFriendlyError(chat.id, "chat_not_allowed");
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.callback",
      action: data.slice(0, 80),
      result: "fail",
      reason: "chat_not_allowed",
      reqContext
    });
    return;
  }

  const linkedUser = await resolveLinkedTelegramUserOrNotify({
    from,
    chat,
    reqContext,
    command: "callback",
    actionLabel: data.slice(0, 80)
  });
  if (!linkedUser) {
    return;
  }

  const action = data.slice(MENU_CALLBACK_PREFIX.length);
  switch (action) {
    case "home":
      await sendPanelMenu(chat.id);
      break;
    case "tasks": {
      const text = await buildMyTasksMessage(linkedUser);
      await sendTelegramMessageChunked(chat.id, text, {
        replyMarkup: buildBackMenuKeyboard()
      });
      break;
    }
    case "alerts": {
      const text = await buildAlertsMessage(linkedUser);
      await sendTelegramMessage(chat.id, text, {
        replyMarkup: buildBackMenuKeyboard()
      });
      break;
    }
    case "bitacoras": {
      const text = await buildBitacorasMessage(linkedUser);
      await sendTelegramMessageChunked(chat.id, text, {
        replyMarkup: buildBackMenuKeyboard()
      });
      break;
    }
    case "search":
      await sendTelegramMessage(chat.id, [
        "Buscar tarea",
        "Usa el comando:",
        "/buscar <id o texto>",
        "",
        "Ejemplos:",
        "/buscar 15",
        "/buscar incidente red"
      ].join("\n"), {
        replyMarkup: buildBackMenuKeyboard()
      });
      break;
    case "status": {
      const text = await buildGeneralStatusMessage(linkedUser);
      await sendTelegramMessage(chat.id, text, {
        replyMarkup: buildBackMenuKeyboard()
      });
      break;
    }
    default:
      await sendTelegramMessage(chat.id, "Accion no soportada en este menu.");
      break;
  }

  await auditTelegramAction({
    userId: linkedUser.id,
    chatId,
    telegramUserId,
    auditAction: "telegram.bot.callback",
    action,
    result: "success",
    reqContext
  });
}

async function handleTelegramMessage(update, context = {}) {
  const reqContext = createTelegramReqContext(context);
  const message = update?.message;
  const text = String(message?.text || "");
  const parsed = parseCommand(text);
  if (!parsed) {
    return;
  }

  const chatId = normalizeTelegramChatId(message?.chat?.id);
  const telegramUserId = Number(message?.from?.id);
  const throttle = evaluateUserThrottle(telegramUserId);
  if (!throttle.allowed) {
    if (throttle.shouldNotify) {
      await sendUserFriendlyError(chatId, "soft_throttle", {
        replyToMessageId: message?.message_id || null
      });
    }
    await auditTelegramAction({
      chatId,
      telegramUserId,
      auditAction: "telegram.bot.command_throttled",
      command: `/${parsed.command}`,
      action: parsed.command,
      result: "fail",
      reason: throttle.reason || "throttled",
      details: {
        retryAfterSeconds: Math.max(0, Number(throttle.retryAfterSeconds) || 0)
      },
      reqContext
    });
    return;
  }

  if (parsed.command === "start") {
    await handleStartCommand(update, context);
    return;
  }

  if (parsed.command === "menu") {
    await handleMenuCommand(update, context);
    return;
  }

  if (parsed.command === "buscar") {
    await handleSearchCommand(update, parsed.args, context);
  }
}

async function processTelegramUpdate(update, context = {}) {
  if (!isTelegramInteractiveEnabled()) {
    return { ok: false, skipped: true, reason: "telegram_interactive_disabled" };
  }

  cleanupUserThrottleState();

  const parsedPayload = parseTelegramWebhookPayload(update);
  if (!parsedPayload.ok) {
    const metadata = extractUpdateMetadata(update);
    await auditWebhookInvalidPayload({
      ipAddress: context?.ip || null,
      chatId: metadata.chatId,
      reqContext: createTelegramReqContext(context)
    });
    return { ok: false, error: "validation_error" };
  }

  const safeUpdate = parsedPayload.data;
  const metadata = extractUpdateMetadata(safeUpdate);
  const reqContext = createTelegramReqContext(context);

  try {
    if (safeUpdate?.callback_query) {
      await handleCallbackQuery(safeUpdate, context);
      return { ok: true };
    }

    if (safeUpdate?.message?.text) {
      await handleTelegramMessage(safeUpdate, context);
      return { ok: true };
    }

    return { ok: true, skipped: true, reason: "unsupported_update_type" };
  } catch (error) {
    logger.warn({ err: error }, "Fallo procesando update de Telegram");
    if (metadata.chatId) {
      await sendUserFriendlyError(metadata.chatId, "internal_error");
    }
    await auditTelegramAction({
      userId: null,
      chatId: metadata.chatId,
      telegramUserId: metadata.telegramUserId,
      auditAction: "telegram.bot.processing_error",
      action: context?.source === "polling" ? "polling_update" : "webhook_update",
      result: "fail",
      reason: "internal_error",
      reqContext
    });
    return { ok: false, error: "telegram_update_processing_failed" };
  }
}

async function processTelegramWebhookUpdate(update, context = {}) {
  return processTelegramUpdate(update, {
    ...context,
    source: context?.source || "webhook"
  });
}

module.exports = {
  isTelegramInteractiveEnabled,
  getTelegramBotMode,
  isTelegramWebhookModeEnabled,
  isTelegramPollingModeEnabled,
  isTelegramWebhookAuthorized,
  evaluateWebhookRateLimit,
  extractUpdateMetadata,
  auditWebhookRateLimited,
  telegramApiRequest,
  processTelegramUpdate,
  processTelegramWebhookUpdate,
  issueTelegramLinkToken,
  getTelegramLinkStatus,
  unlinkTelegramUser
};
