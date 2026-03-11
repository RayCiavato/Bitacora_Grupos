const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/ready", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

module.exports = { healthRouter: router };

