const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const {
  isTelegramInteractiveEnabled,
  isTelegramWebhookModeEnabled,
  isTelegramWebhookAuthorized,
  processTelegramWebhookUpdate,
  evaluateWebhookRateLimit,
  extractUpdateMetadata,
  auditWebhookRateLimited,
  issueTelegramLinkToken,
  getTelegramLinkStatus,
  unlinkTelegramUser
} = require("../services/telegramBot");

const router = express.Router();

const emptyBodySchema = z.object({}).passthrough();

router.post("/webhook", async (req, res) => {
  if (!isTelegramWebhookModeEnabled()) {
    return res.status(404).json({ error: "not_found" });
  }

  if (!isTelegramWebhookAuthorized(req)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const metadata = extractUpdateMetadata(payload);
  const rateLimit = evaluateWebhookRateLimit({
    ipAddress: req.ip,
    chatId: metadata.chatId
  });
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(1, Number(rateLimit.retryAfterSeconds || 1));
    res.set("Retry-After", String(retryAfterSeconds));
    await auditWebhookRateLimited({
      ipAddress: req.ip,
      chatId: metadata.chatId,
      reason: rateLimit.scope || "rate_limited",
      retryAfterSeconds,
      reqContext: {
        ip: req.ip,
        headers: {
          "user-agent": req.headers["user-agent"] || "telegram-webhook"
        }
      }
    });
    return res.status(429).json({
      error: "too_many_requests",
      retryAfterSeconds
    });
  }

  const result = await processTelegramWebhookUpdate(payload, {
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "telegram-webhook"
  });
  if (!result?.ok && result?.error === "validation_error") {
    return res.status(400).json({ error: "validation_error" });
  }

  return res.status(200).json({ ok: true });
});

router.get("/link-status", authenticate, async (req, res, next) => {
  try {
    const status = await getTelegramLinkStatus(req.user);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post("/link-token", authenticate, async (req, res, next) => {
  try {
    emptyBodySchema.parse(req.body || {});
    if (!isTelegramInteractiveEnabled()) {
      return res.status(503).json({ error: "service_unavailable" });
    }

    const created = await issueTelegramLinkToken({
      user: req.user,
      req
    });

    return res.status(201).json({
      code: created.code,
      expiresAt: created.expiresAt,
      instructions: `En Telegram ejecuta: /start ${created.code}`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.delete("/link", authenticate, async (req, res, next) => {
  try {
    const removed = await unlinkTelegramUser(req.user, req);
    return res.json({
      unlinked: removed
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { telegramIntegrationRouter: router };
