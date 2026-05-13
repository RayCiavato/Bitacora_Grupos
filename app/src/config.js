const dotenv = require("dotenv");

dotenv.config();

function readBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

function readCsvList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readTelegramBotMode(value) {
  return String(value || "webhook")
    .trim()
    .toLowerCase();
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  sessionIdleTimeoutMinutes: Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES || 120),
  jwtIssuer: process.env.JWT_ISSUER || "bitacora-api",
  jwtAudience: process.env.JWT_AUDIENCE || "bitacora-clients",
  authCookieName: process.env.AUTH_COOKIE_NAME || "bitacora_access",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "bitacora_refresh",
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "bitacora_csrf",
  cookieDomain: process.env.COOKIE_DOMAIN || "",
  cookieSecure: readBool(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),
  cookieSameSite: process.env.COOKIE_SAMESITE || "strict",
  adminDefaultName: process.env.ADMIN_DEFAULT_NAME || "Administrador",
  adminDefaultEmail: process.env.ADMIN_DEFAULT_EMAIL || "admin@bitacora.local",
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || "ChangeMe!123456",
  maxFailedAttempts: Number(process.env.MAX_FAILED_ATTEMPTS || 5),
  lockMinutes: Number(process.env.LOCK_MINUTES || 15),
  passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH || 12),
  mfaRequired: readBool(process.env.MFA_REQUIRED, true),
  allowPublicRegistration: readBool(process.env.ALLOW_PUBLIC_REGISTRATION, false),
  accountApprovalRequired: readBool(process.env.ACCOUNT_APPROVAL_REQUIRED, true),
  inviteTtlHours: Number(process.env.INVITE_TTL_HOURS || 48),
  allowedEmailDomains: readCsvList(
    process.env.ALLOWED_EMAIL_DOMAINS || "bitacora.local,empresa.local,empresa.com,institucion.gob.ve"
  ),
  allowEmailSubdomains: readBool(process.env.ALLOW_EMAIL_SUBDOMAINS, true),
  internalNetworkOnly: readBool(process.env.INTERNAL_NETWORK_ONLY, false),
  allowedNetworks: readCsvList(
    process.env.ALLOWED_NETWORKS || "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32"
  ),
  uploadDir: process.env.UPLOAD_DIR || "/tmp/bitacora-uploads",
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
  reminderEnabled: readBool(process.env.REMINDER_ENABLED, false),
  reminderCron: process.env.REMINDER_CRON || "0 17 * * 1-5",
  reminderTimezone: process.env.REMINDER_TIMEZONE || "America/Caracas",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: readBool(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || "",
  telegramEnabled: readBool(process.env.TELEGRAM_ENABLED, false),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  telegramChatIds: readCsvList(process.env.TELEGRAM_CHAT_IDS || ""),
  telegramGroupChatIds: readCsvList(process.env.TELEGRAM_GROUP_CHAT_IDS || ""),
  telegramTaskAlertCron: process.env.TELEGRAM_TASK_ALERT_CRON || "*/15 * * * *",
  telegramNotifyEventCorrelations: readBool(process.env.TELEGRAM_NOTIFY_EVENT_CORRELATIONS, false),
  telegramBotInteractiveEnabled: readBool(process.env.TELEGRAM_BOT_INTERACTIVE_ENABLED, false),
  telegramBotMode: readTelegramBotMode(process.env.TELEGRAM_BOT_MODE || "webhook"),
  telegramBotWebhookSecret: process.env.TELEGRAM_BOT_WEBHOOK_SECRET || "",
  telegramPollingTimeout: Number(process.env.TELEGRAM_POLLING_TIMEOUT || 30),
  telegramPollingIntervalMs: Number(process.env.TELEGRAM_POLLING_INTERVAL_MS || 1000),
  telegramPollingAllowedUpdates: readCsvList(
    process.env.TELEGRAM_POLLING_ALLOWED_UPDATES || "message,callback_query"
  ),
  telegramWebhookIpLimitPerMinute: Number(process.env.TELEGRAM_WEBHOOK_IP_LIMIT_PER_MINUTE || 60),
  telegramWebhookChatLimitPerMinute: Number(process.env.TELEGRAM_WEBHOOK_CHAT_LIMIT_PER_MINUTE || 20),
  telegramUserCooldownMs: Number(process.env.TELEGRAM_USER_COOLDOWN_MS || 2500),
  telegramUserLimitPerMinute: Number(process.env.TELEGRAM_USER_LIMIT_PER_MINUTE || 30),
  telegramLinkSessionTtlMinutes: Number(process.env.TELEGRAM_LINK_SESSION_TTL_MINUTES || 0)
};

function assertConfig() {
  const required = ["databaseUrl", "jwtSecret"];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  if (config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
  }

  if (config.uploadMaxBytes <= 0 || Number.isNaN(config.uploadMaxBytes)) {
    throw new Error("UPLOAD_MAX_BYTES debe ser un numero positivo.");
  }

  if (
    !Number.isInteger(config.sessionIdleTimeoutMinutes) ||
    config.sessionIdleTimeoutMinutes < 5 ||
    config.sessionIdleTimeoutMinutes > 1440
  ) {
    throw new Error("SESSION_IDLE_TIMEOUT_MINUTES debe estar entre 5 y 1440.");
  }

  if (config.reminderEnabled) {
    const hasEmail = config.smtpHost && config.smtpFrom;
    const hasWebhook = config.slackWebhookUrl || config.teamsWebhookUrl;
    if (!hasEmail && !hasWebhook) {
      throw new Error(
        "REMINDER_ENABLED=true requiere SMTP configurado o webhook de Slack/Teams."
      );
    }
  }

  if (config.telegramEnabled) {
    if (!config.telegramBotToken) {
      throw new Error("TELEGRAM_ENABLED=true requiere TELEGRAM_BOT_TOKEN.");
    }
  }

  if (config.telegramBotInteractiveEnabled) {
    if (!config.telegramEnabled) {
      throw new Error("TELEGRAM_BOT_INTERACTIVE_ENABLED=true requiere TELEGRAM_ENABLED=true.");
    }

    if (!["webhook", "polling"].includes(config.telegramBotMode)) {
      throw new Error("TELEGRAM_BOT_MODE debe ser webhook o polling.");
    }

    if (
      config.telegramBotMode === "webhook" &&
      (!config.telegramBotWebhookSecret || config.telegramBotWebhookSecret.length < 16)
    ) {
      throw new Error(
        "TELEGRAM_BOT_WEBHOOK_SECRET es obligatorio y debe tener al menos 16 caracteres cuando TELEGRAM_BOT_MODE=webhook."
      );
    }
  }

  if (!["webhook", "polling"].includes(config.telegramBotMode)) {
    throw new Error("TELEGRAM_BOT_MODE debe ser webhook o polling.");
  }

  if (
    Number.isNaN(config.telegramPollingTimeout) ||
    !Number.isFinite(config.telegramPollingTimeout) ||
    config.telegramPollingTimeout < 0 ||
    config.telegramPollingTimeout > 50
  ) {
    throw new Error("TELEGRAM_POLLING_TIMEOUT debe estar entre 0 y 50 segundos.");
  }

  if (
    Number.isNaN(config.telegramPollingIntervalMs) ||
    !Number.isFinite(config.telegramPollingIntervalMs) ||
    config.telegramPollingIntervalMs < 250
  ) {
    throw new Error("TELEGRAM_POLLING_INTERVAL_MS debe ser mayor o igual a 250.");
  }

  const allowedTelegramUpdateTypes = new Set(["message", "callback_query"]);
  if (
    !Array.isArray(config.telegramPollingAllowedUpdates) ||
    config.telegramPollingAllowedUpdates.length === 0 ||
    config.telegramPollingAllowedUpdates.some((item) => !allowedTelegramUpdateTypes.has(item))
  ) {
    throw new Error(
      "TELEGRAM_POLLING_ALLOWED_UPDATES solo puede incluir message y callback_query."
    );
  }

  if (
    Number.isNaN(config.telegramWebhookIpLimitPerMinute) ||
    !Number.isFinite(config.telegramWebhookIpLimitPerMinute) ||
    config.telegramWebhookIpLimitPerMinute < 0
  ) {
    throw new Error("TELEGRAM_WEBHOOK_IP_LIMIT_PER_MINUTE debe ser mayor o igual a 0.");
  }

  if (
    Number.isNaN(config.telegramWebhookChatLimitPerMinute) ||
    !Number.isFinite(config.telegramWebhookChatLimitPerMinute) ||
    config.telegramWebhookChatLimitPerMinute < 0
  ) {
    throw new Error("TELEGRAM_WEBHOOK_CHAT_LIMIT_PER_MINUTE debe ser mayor o igual a 0.");
  }

  if (
    Number.isNaN(config.telegramUserCooldownMs) ||
    !Number.isFinite(config.telegramUserCooldownMs) ||
    config.telegramUserCooldownMs < 0
  ) {
    throw new Error("TELEGRAM_USER_COOLDOWN_MS debe ser mayor o igual a 0.");
  }

  if (
    Number.isNaN(config.telegramUserLimitPerMinute) ||
    !Number.isFinite(config.telegramUserLimitPerMinute) ||
    config.telegramUserLimitPerMinute < 0
  ) {
    throw new Error("TELEGRAM_USER_LIMIT_PER_MINUTE debe ser mayor o igual a 0.");
  }

  if (
    Number.isNaN(config.telegramLinkSessionTtlMinutes) ||
    !Number.isFinite(config.telegramLinkSessionTtlMinutes) ||
    config.telegramLinkSessionTtlMinutes < 0
  ) {
    throw new Error("TELEGRAM_LINK_SESSION_TTL_MINUTES debe ser mayor o igual a 0.");
  }

  if (!Array.isArray(config.allowedEmailDomains) || config.allowedEmailDomains.length === 0) {
    throw new Error("ALLOWED_EMAIL_DOMAINS debe incluir al menos un dominio institucional.");
  }

  if (
    Number.isNaN(config.inviteTtlHours) ||
    !Number.isFinite(config.inviteTtlHours) ||
    config.inviteTtlHours < 1 ||
    config.inviteTtlHours > 720
  ) {
    throw new Error("INVITE_TTL_HOURS debe estar entre 1 y 720 horas.");
  }

  if (config.internalNetworkOnly && config.allowedNetworks.length === 0) {
    throw new Error("INTERNAL_NETWORK_ONLY=true requiere ALLOWED_NETWORKS.");
  }
}

module.exports = { config, assertConfig };
