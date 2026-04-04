const path = require("path");
const { logger } = require("../logger");

const API_PREFIXES = ["/auth", "/users", "/events", "/tasks", "/templates", "/audit", "/metrics"];
const SENSITIVE_PREFIXES = [
  "/.env",
  "/.git",
  "/.svn",
  "/.hg",
  "/src",
  "/routes",
  "/route",
  "/controllers",
  "/controller",
  "/services",
  "/service",
  "/config",
  "/configs",
  "/public",
  "/uploads",
  "/views",
  "/view",
  "/logs",
  "/log",
  "/backups",
  "/backup",
  "/scripts",
  "/script",
  "/db",
  "/infra",
  "/monitoring",
  "/node_modules"
];
const SENSITIVE_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "docker-compose.yml",
  "docker-compose.yaml",
  "dockerfile",
  "caddyfile",
  "server.js",
  "config.js",
  "db.js",
  "readme.md",
  "manual_despliegue_servidor.md"
]);
const SENSITIVE_BASENAME_RE = /^(?:config|server|docker-compose)(?:\..+)?$/i;
const SENSITIVE_EXTENSION_RE =
  /\.(?:bak|backup|log|sql|sqlite|db|yml|yaml|ini|conf|sh|ps1|map)(?:$|\?)/i;

function isApiPath(pathname) {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (_error) {
    return String(value || "");
  }
}

function decodeRepeated(value, rounds = 2) {
  let current = String(value || "");
  for (let index = 0; index < rounds; index += 1) {
    const decoded = safeDecode(current);
    if (decoded === current) {
      break;
    }
    current = decoded;
  }
  return current;
}

function normalizePathname(pathname) {
  const decoded = safeDecode(pathname).replace(/\\/g, "/");
  const clean = decoded.startsWith("/") ? decoded : `/${decoded}`;
  return clean.replace(/\/{2,}/g, "/");
}

function hasTraversalAttempt(pathname, originalUrl) {
  const decodedPath = decodeRepeated(pathname, 3).toLowerCase();
  const decodedUrl = decodeRepeated(originalUrl, 3).toLowerCase();
  const normalizedPath = decodedPath.replace(/\\/g, "/");
  const normalizedUrl = decodedUrl.replace(/\\/g, "/");
  return (
    /(^|\/)\.\.(?:\/|$)/.test(normalizedPath) ||
    /(^|\/)\.\.(?:\/|$)/.test(normalizedUrl) ||
    normalizedPath.includes("%2e%2e") ||
    normalizedUrl.includes("%2e%2e") ||
    normalizedPath.includes("%252e%252e") ||
    normalizedUrl.includes("%252e%252e") ||
    normalizedPath.includes("%2f") ||
    normalizedUrl.includes("%2f") ||
    normalizedPath.includes("%5c") ||
    normalizedUrl.includes("%5c")
  );
}

function hasSensitiveFileName(pathname) {
  const lowerPath = pathname.toLowerCase();
  const baseName = path.posix.basename(lowerPath);
  return (
    SENSITIVE_BASENAMES.has(baseName) ||
    SENSITIVE_BASENAME_RE.test(baseName) ||
    SENSITIVE_EXTENSION_RE.test(lowerPath)
  );
}

function hasSensitivePrefix(pathname) {
  const lowerPath = pathname.toLowerCase();
  return SENSITIVE_PREFIXES.some(
    (prefix) => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`)
  );
}

function sendGenericNotFound(req, res) {
  res.set("Cache-Control", "no-store");
  if (isApiPath(req.path || "")) {
    return res.status(404).json({ error: "not_found", message: "Not found" });
  }
  return res.status(404).type("text/plain").send("Not found");
}

function sendPlainNotFound(res) {
  res.set("Cache-Control", "no-store");
  return res.status(404).type("text/plain").send("Not found");
}

function hardenPathExposure(req, res, next) {
  const pathname = normalizePathname(req.path || "/");
  const originalUrl = String(req.originalUrl || req.url || "");

  if (hasTraversalAttempt(pathname, originalUrl)) {
    return sendPlainNotFound(res);
  }

  if (hasSensitivePrefix(pathname) || hasSensitiveFileName(pathname)) {
    return sendPlainNotFound(res);
  }

  return next();
}

function notFoundHandler(req, res) {
  return sendGenericNotFound(req, res);
}

function secureErrorHandler(err, req, res, _next) {
  const rawStatus = Number(err?.status || err?.statusCode || 500);
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;

  if (status >= 500) {
    logger.error({ err, path: req.path, method: req.method }, "Unhandled API error");
  }

  if (isApiPath(req.path || "")) {
    if (status === 400) {
      return res.status(400).json({ error: "validation_error", message: "Solicitud invalida" });
    }
    if (status === 401) {
      return res.status(401).json({ error: "unauthorized", message: "No autorizado" });
    }
    if (status === 403) {
      return res.status(403).json({ error: "forbidden", message: "Acceso denegado" });
    }
    if (status === 404) {
      return res.status(404).json({ error: "not_found", message: "Not found" });
    }
    if (status >= 500) {
      return res.status(500).json({ error: "internal_server_error", message: "Error interno" });
    }
    return res.status(status).json({ error: "request_error", message: "Solicitud invalida" });
  }

  if (status === 404) {
    return res.status(404).type("text/plain").send("Not found");
  }

  return res.status(500).type("text/plain").send("Internal server error");
}

module.exports = {
  hardenPathExposure,
  notFoundHandler,
  secureErrorHandler,
  sendGenericNotFound,
  sendPlainNotFound
};
