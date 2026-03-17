const dotenv = require("dotenv");

dotenv.config();

function readBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
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
  allowPublicRegistration: readBool(process.env.ALLOW_PUBLIC_REGISTRATION, true),
  uploadDir: process.env.UPLOAD_DIR || "/tmp/bitacora-uploads",
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
  reminderEnabled: readBool(process.env.REMINDER_ENABLED, false),
  reminderCron: process.env.REMINDER_CRON || "0 17 * * 1-5",
  reminderTimezone: process.env.REMINDER_TIMEZONE || "America/Bogota",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: readBool(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || ""
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

  if (config.reminderEnabled) {
    const hasEmail = config.smtpHost && config.smtpFrom;
    const hasWebhook = config.slackWebhookUrl || config.teamsWebhookUrl;
    if (!hasEmail && !hasWebhook) {
      throw new Error(
        "REMINDER_ENABLED=true requiere SMTP configurado o webhook de Slack/Teams."
      );
    }
  }
}

module.exports = { config, assertConfig };
