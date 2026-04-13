const express = require("express");
const { z } = require("zod");
const { authenticate, requireRole } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const { canUserAccessPanel } = require("../services/authorization");
const {
  ensureSystemSettingsLoaded,
  updateSystemSettings
} = require("../services/systemSettingsStore");
const {
  parseSystemSettingsPatch
} = require("../services/systemSettings");

const router = express.Router();

function ensureCanManageSettings(req, res) {
  if (!canUserAccessPanel(req.user, "configuracion")) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

router.get("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageSettings(req, res)) {
      return;
    }

    const settings = await ensureSystemSettingsLoaded();
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
});

router.patch("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageSettings(req, res)) {
      return;
    }

    const parsedPatch = parseSystemSettingsPatch(req.body);
    const updateResult = await updateSystemSettings(parsedPatch, req.user?.sub || null);

    await createAuditLog({
      userId: req.user.sub,
      action: "settings.updated",
      entity: "system_settings",
      metadata: {
        before: updateResult.before,
        after: updateResult.after,
        sectionsChanged: Object.keys(parsedPatch || {})
      },
      req
    });

    return res.json({
      message: "Configuracion actualizada correctamente",
      settings: updateResult.after
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { settingsRouter: router };