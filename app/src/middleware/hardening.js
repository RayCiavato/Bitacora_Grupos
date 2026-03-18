const path = require("path");
const { logger } = require("../logger");

const API_PREFIXES = ["/auth", "/users", "/events", "/templates", "/audit", "/metrics"];
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
  "/config",
  "/configs",
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
  "package.json",
  "package-lock.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "caddyfile",
  "readme.md",
  "manual_despliegue_servidor.md"
]);
const SENSITIVE_EXTENSION_RE =
  /\.(?:bak|backup|log|sql|sqlite|yml|yaml|ini|conf|sh|ps1|map)(?:$|\?)/i;

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

function normalizePathname(pathname) {
  const decoded = safeDecode(pathname).replace(/\\/g, "/");
  const clean = decoded.startsWith("/") ? decoded : `/${decoded}`;
  return clean.replace(/\/{2,}/g, "/");
}

function hasTraversalAttempt(pathname, originalUrl) {
  const decodedPath = safeDecode(pathname).toLowerCase();
  const decodedUrl = safeDecode(originalUrl).toLowerCase();
  return (
    decodedPath.includes("..") ||
    decodedUrl.includes("%2e%2e") ||
    decodedPath.includes("\\") ||
    decodedUrl.includes("%5c")
  );
}

function hasSensitiveFileName(pathname) {
  const lowerPath = pathname.toLowerCase();
  const baseName = path.posix.basename(lowerPath);
  return SENSITIVE_BASENAMES.has(baseName) || SENSITIVE_EXTENSION_RE.test(lowerPath);
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
    return res.status(404).json({ error: "not_found" });
  }
  return res.status(404).type("text/plain").send("Not found");
}

function hardenPathExposure(req, res, next) {
  const pathname = normalizePathname(req.path || "/");
  const originalUrl = String(req.originalUrl || req.url || "");

  if (hasTraversalAttempt(pathname, originalUrl)) {
    return sendGenericNotFound(req, res);
  }

  if (hasSensitivePrefix(pathname) || hasSensitiveFileName(pathname)) {
    return sendGenericNotFound(req, res);
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
    if (status === 404) {
      return res.status(404).json({ error: "not_found" });
    }
    if (status >= 500) {
      return res.status(500).json({ error: "internal_server_error" });
    }
    return res.status(status).json({ error: "request_error" });
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
  sendGenericNotFound
};
