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
const { tasksRouter } = require("./routes/tasks");
const { templatesRouter } = require("./routes/templates");
const { auditRouter } = require("./routes/audit");
const { healthRouter } = require("./routes/health");
const { startReminderScheduler } = require("./services/reminders");
const {
  hardenPathExposure,
  notFoundHandler,
  secureErrorHandler
} = require("./middleware/hardening");

assertConfig();

function buildHelmetConfig() {
  return {
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    permissionsPolicy: {
      features: {
        geolocation: [],
        microphone: [],
        camera: [],
        payment: [],
        usb: []
      }
    },
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
  app.set("query parser", "simple");
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
  app.use(hardenPathExposure);

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
      req.path.startsWith("/tasks") ||
      req.path.startsWith("/templates") ||
      req.path.startsWith("/audit")
    ) {
      res.set("Cache-Control", "no-store");
    }
    next();
  });

  // Evita exposicion accidental de vistas de preview no necesarias en produccion.
  app.use((req, res, next) => {
    if (req.path === "/preview-dashboard.html") {
      return res.status(404).send("Not found");
    }
    return next();
  });

  // Evita navegacion directa a bundles JS desde barra de direcciones.
  // Nota: esto no "oculta" codigo al navegador, solo reduce exposicion casual.
  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method) || !/\.(js|map)$/i.test(req.path)) {
      return next();
    }

    if (req.path.toLowerCase().endsWith(".map")) {
      return res.status(404).send("Not found");
    }

    const allowedPublicJs = new Set([
      "/assets/app.min.js",
      "/assets/tasks.min.js",
      "/assets/report-view.min.js",
      "/assets/security.min.js",
      "/sw.js",
      "/vendor/chart.js"
    ]);
    if (req.path.toLowerCase().endsWith(".js") && !allowedPublicJs.has(req.path)) {
      return res.status(404).send("Not found");
    }

    const protectedAssetTokens = {
      "/assets/app.min.js": "web",
      "/assets/tasks.min.js": "tasks",
      "/assets/report-view.min.js": "report",
      "/assets/security.min.js": "sec"
    };
    const expectedAssetToken = protectedAssetTokens[req.path];
    const requestAssetToken = String(req.query?.asset || "");

    const secFetchDest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
    const secFetchMode = String(req.headers["sec-fetch-mode"] || "").toLowerCase();
    const secFetchUser = String(req.headers["sec-fetch-user"] || "").toLowerCase();
    const upgradeInsecureRequests = String(req.headers["upgrade-insecure-requests"] || "");
    const acceptHeader = String(req.headers.accept || "").toLowerCase();
    const referer = String(req.headers.referer || "");
    const host = String(req.headers.host || "");
    const sameOriginHttp = `http://${host}/`;
    const sameOriginHttps = `https://${host}/`;
    const hasSameOriginReferer =
      host && (referer.startsWith(sameOriginHttp) || referer.startsWith(sameOriginHttps));

    const scriptLikeRequest =
      secFetchDest === "script" ||
      secFetchDest === "worker" ||
      secFetchDest === "serviceworker" ||
      secFetchDest === "sharedworker";
    const htmlNavigationAccept =
      acceptHeader.includes("text/html") || acceptHeader.includes("application/xhtml+xml");
    const directDocumentRequest =
      secFetchMode === "navigate" ||
      secFetchDest === "document" ||
      secFetchUser === "?1" ||
      upgradeInsecureRequests === "1" ||
      htmlNavigationAccept;

    if (expectedAssetToken && requestAssetToken !== expectedAssetToken) {
      return res.status(404).send("Not found");
    }

    if (directDocumentRequest) {
      return res.status(404).send("Not found");
    }

    const looksLikeAssetFetch = scriptLikeRequest || (hasSameOriginReferer && !directDocumentRequest);

    if (expectedAssetToken) {
      if (!looksLikeAssetFetch) {
        return res.status(404).send("Not found");
      }
      return next();
    }

    if (!looksLikeAssetFetch) {
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
  const reportExportLimiter = buildLimiter(
    15 * 60 * 1000,
    40,
    "Demasiadas exportaciones de reportes."
  );
  const attachmentsLimiter = buildLimiter(
    15 * 60 * 1000,
    90,
    "Demasiadas operaciones de adjuntos."
  );
  const tasksExportLimiter = buildLimiter(
    15 * 60 * 1000,
    40,
    "Demasiadas exportaciones de tareas."
  );

  app.use("/", healthRouter);
  app.get("/metrics", metricsHandler);
  app.use("/auth/login", authLimiter);
  app.use("/auth/register", registerLimiter);
  app.use("/auth/refresh", refreshLimiter);
  app.use("/auth/password/recover", recoverLimiter);
  app.use("/events/report/export", reportExportLimiter);
  app.use("/tasks/export", tasksExportLimiter);
  app.use("/events/:id/attachments", attachmentsLimiter);
  app.use("/events/attachments/:attachmentId", attachmentsLimiter);
  app.use("/events/attachments/:attachmentId/download", attachmentsLimiter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/audit", auditRouter);
  app.use("/templates", templatesRouter);
  app.use("/events", eventsRouter);
  app.use("/tasks", tasksRouter);
  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

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
    "/tareas",
    "/usuarios",
    "/plantillas"
  ];

  panelRoutes.forEach((routePath) => {
    app.get(routePath, (_req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  });

  const allowedStaticPublicFiles = new Set([
    "/index.html",
    "/styles.css",
    "/report-view.html",
    "/report-view.css",
    "/manifest.webmanifest",
    "/offline.html",
    "/icons/icon.svg",
    "/icons/icon-maskable.svg",
    "/assets/app.min.js",
    "/assets/tasks.min.js",
    "/assets/report-view.min.js",
    "/assets/security.min.js"
  ]);

  app.use((req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      return next();
    }

    const pathname = String(req.path || "/");
    if (pathname === "/" || panelRoutes.includes(pathname)) {
      return next();
    }

    if (allowedStaticPublicFiles.has(pathname)) {
      return next();
    }

    if (/^\/(?:assets|icons)\//.test(pathname)) {
      return res.status(404).type("text/plain").send("Not found");
    }

    if (path.extname(pathname)) {
      return res.status(404).type("text/plain").send("Not found");
    }

    return next();
  });

  app.use(
    express.static(path.join(__dirname, "public"), {
      maxAge: "6h",
      dotfiles: "deny",
      index: false,
      redirect: false
    })
  );

  app.use(notFoundHandler);
  app.use(secureErrorHandler);

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
