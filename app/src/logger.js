const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.cookies",
      "req.body.password",
      "req.body.newPassword",
      "req.body.mfaToken",
      "req.body.token",
      "req.body.refreshToken",
      "password",
      "password_hash",
      "mfa_secret",
      "mfa_temp_secret",
      "token_hash"
    ],
    censor: "[REDACTED]"
  }
});

module.exports = { logger };
