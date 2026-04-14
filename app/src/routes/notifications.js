const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const { canUserAccessPanel, resolveActorId } = require("../services/authorization");
const {
  listNotificationsForUser,
  normalizeNotificationKey,
  markNotificationAsRead,
  markNotificationsAsRead
} = require("../services/notifications");

const router = express.Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(80).default(40),
  unreadOnly: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }
      return String(value || "").toLowerCase() === "true";
    })
});

const notificationParamSchema = z.object({
  notificationKey: z.string().min(1).max(160)
});

const markManyBodySchema = z
  .object({
    keys: z.array(z.string().min(1).max(160)).max(120).optional()
  })
  .strict()
  .optional();

function ensureCanAccessNotifications(req, res) {
  if (!canUserAccessPanel(req.user, "dashboard")) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    if (!ensureCanAccessNotifications(req, res)) {
      return;
    }

    const query = listQuerySchema.parse(req.query || {});
    const notifications = await listNotificationsForUser(req.user, { limit: query.limit });
    const items = query.unreadOnly ? notifications.filter((item) => !item.read) : notifications;

    return res.json({
      items,
      summary: {
        total: notifications.length,
        unread: notifications.filter((item) => !item.read).length
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    if (!ensureCanAccessNotifications(req, res)) {
      return;
    }

    const body = markManyBodySchema.parse(req.body);
    const actorId = resolveActorId(req.user);
    if (!actorId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    let keys = body?.keys;
    if (!Array.isArray(keys) || keys.length === 0) {
      const notifications = await listNotificationsForUser(req.user, { limit: 80 });
      keys = notifications.map((item) => item.key);
    }

    const marked = await markNotificationsAsRead(actorId, keys);

    return res.json({
      message: "Notificaciones marcadas como leidas.",
      marked
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/:notificationKey/read", authenticate, async (req, res, next) => {
  try {
    if (!ensureCanAccessNotifications(req, res)) {
      return;
    }

    const { notificationKey } = notificationParamSchema.parse(req.params || {});
    const normalizedKey = normalizeNotificationKey(notificationKey);
    if (!normalizedKey) {
      return res.status(400).json({ error: "validation_error" });
    }

    const actorId = resolveActorId(req.user);
    if (!actorId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const marked = await markNotificationAsRead(actorId, normalizedKey);
    if (!marked) {
      return res.status(400).json({ error: "validation_error" });
    }

    return res.json({
      message: "Notificacion marcada como leida.",
      key: normalizedKey
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { notificationsRouter: router };
