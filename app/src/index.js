const express = require("express");
const path = require("path");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { assertConfig, config } = require("./config");
const { logger } = require("./logger");
const { ensureDatabaseSchema, ensureAdminUser } = require("./db");
const { metricsMiddleware, metricsHandler } = require("./metrics");
const { authRouter } = require("./routes/auth");
const { usersRouter } = require("./routes/users");
const { eventsRouter } = require("./routes/events");
const { templatesRouter } = require("./routes/templates");
const { auditRouter } = require("./routes/audit");
const { healthRouter } = require("./routes/health");
const { startReminderScheduler } = require("./services/reminders");

assertConfig();

function buildHelmetConfig() {
  return {
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  };
}

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet(buildHelmetConfig()));
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ logger }));
  app.use(metricsMiddleware);

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false
  });

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false
  });

  const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use("/", healthRouter);
  app.get("/metrics", metricsHandler);
  app.use("/auth/login", authLimiter);
  app.use("/auth/register", registerLimiter);
  app.use("/auth/refresh", refreshLimiter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/audit", auditRouter);
  app.use("/templates", templatesRouter);
  app.use("/events", eventsRouter);

  app.get("/sw.js", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(__dirname, "public", "sw.js"));
  });

  app.get("/manifest.webmanifest", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.join(__dirname, "public", "manifest.webmanifest"));
  });

  app.use(
    express.static(path.join(__dirname, "public"), {
      maxAge: "6h"
    })
  );

  app.use((err, _req, res, _next) => {
    logger.error({ err }, "Unhandled API error");
    res.status(500).json({ error: "internal_server_error" });
  });

  return app;
}

async function start() {
  await ensureDatabaseSchema();
  await ensureAdminUser();
  startReminderScheduler();

  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "Bitacora API running");
  });
}

if (require.main === module) {
  start().catch((error) => {
    logger.fatal({ err: error }, "Unable to start API");
    process.exit(1);
  });
}

module.exports = { createApp, start };
