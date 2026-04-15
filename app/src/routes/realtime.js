const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  canUserAccessPanel
} = require("../services/authorization");
const { registerRealtimeClient } = require("../services/realtime");

const router = express.Router();

function canUseRealtime(user) {
  return (
    canUserAccessPanel(user, "dashboard") ||
    canUserAccessPanel(user, "resumen") ||
    canUserAccessPanel(user, "tareas") ||
    canUserAccessPanel(user, "adjuntos")
  );
}

router.get("/stream", authenticate, (req, res) => {
  if (!canUseRealtime(req.user)) {
    return res.status(403).json({ error: "forbidden" });
  }

  registerRealtimeClient({
    req,
    res,
    user: req.user
  });
  return undefined;
});

module.exports = { realtimeRouter: router };
