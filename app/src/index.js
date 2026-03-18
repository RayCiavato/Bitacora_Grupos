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
        upgradeInsecureRequests: null,
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
  const isObservabilityPath = (pathname) =>
    pathname === "/metrics" || pathname === "/health" || pathname === "/ready";

  app.use(helmet(buildHelmetConfig()));
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => isObservabilityPath((req.url || "").split("?")[0] || "")
      }
    })
  );
  app.use(metricsMiddleware);

  const allowedMethods = new Set(["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"]);
  app.use((req, res, next) => {
    if (!allowedMethods.has(req.method)) {
      return res.status(405).json({ error: "method_not_allowed" });
    }
    return next();
  });

  app.use((req, res, next) => {
    if (
      req.path.startsWith("/auth") ||
      req.path.startsWith("/users") ||
      req.path.startsWith("/events") ||
      req.path.startsWith("/templates") ||
      req.path.startsWith("/audit")
    ) {
      res.set("Cache-Control", "no-store");
    }
    next();
  });

  // Evita navegacion directa a bundles JS desde barra de direcciones.
  // Nota: esto no "oculta" codigo al navegador, solo reduce exposicion casual.
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.path.endsWith(".js")) {
      return next();
    }

    const secFetchDest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
    const acceptHeader = String(req.headers.accept || "").toLowerCase();
    const directDocumentRequest =
      secFetchDest === "document" || (!secFetchDest && acceptHeader.includes("text/html"));

    if (directDocumentRequest) {
      return res.status(404).send("Not found");
    }

    return next();
  });

  const buildLimiter = (windowMs, max, message, skipFn) =>
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: skipFn,
      handler: (req, res, _next, options) => {
        const resetTime = req.rateLimit?.resetTime;
        const retryAfterSeconds =
          resetTime instanceof Date
            ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
            : undefined;

        return res.status(options.statusCode).json({
          error: "too_many_requests",
          message,
          retryAfterSeconds
        });
      }
    });

  const globalLimiter = buildLimiter(
    15 * 60 * 1000,
    300,
    "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
    (req) => isObservabilityPath(req.path)
  );
  app.use(globalLimiter);

  const authLimiter = buildLimiter(
    15 * 60 * 1000,
    60,
    "Demasiados intentos de inicio de sesion."
  );

  const registerLimiter = buildLimiter(
    60 * 60 * 1000,
    25,
    "Demasiados intentos de registro."
  );

  const refreshLimiter = buildLimiter(
    15 * 60 * 1000,
    80,
    "Demasiados intentos de refresco de sesion."
  );

  const recoverLimiter = buildLimiter(
    15 * 60 * 1000,
    20,
    "Demasiados intentos de recuperacion de contrasena."
  );

  app.use("/", healthRouter);
  app.get("/metrics", metricsHandler);
  app.use("/auth/login", authLimiter);
  app.use("/auth/register", registerLimiter);
  app.use("/auth/refresh", refreshLimiter);
  app.use("/auth/password/recover", recoverLimiter);
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
  app.get("/vendor/chart.js", (_req, res) => {
    res.set("Cache-Control", "public, max-age=86400");
    res.sendFile(path.join(__dirname, "..", "node_modules", "chart.js", "dist", "chart.umd.js"));
  });

  const panelRoutes = [
    "/dashboard",
    "/resumen",
    "/registro/nuevo",
    "/informes",
    "/tendencias",
    "/adjuntos",
    "/usuarios",
    "/plantillas"
  ];

  panelRoutes.forEach((routePath) => {
    app.get(routePath, (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
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
