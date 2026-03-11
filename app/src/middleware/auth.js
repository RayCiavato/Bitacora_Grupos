const { config } = require("../config");
const { pool } = require("../db");
const { verifyAccessToken } = require("../services/tokens");

function parseBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }
  return headerValue.slice("Bearer ".length);
}

function getAccessTokenFromRequest(req) {
  const bearerToken = parseBearerToken(req.headers.authorization);
  if (bearerToken) {
    return bearerToken;
  }

  if (req.cookies && req.cookies[config.authCookieName]) {
    return req.cookies[config.authCookieName];
  }

  return null;
}

async function authenticate(req, res, next) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const result = await pool.query(
      `
        SELECT id, name, email, role, token_version
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const user = result.rows[0];
    if (typeof payload.tokenVersion !== "number" || payload.tokenVersion !== user.token_version) {
      return res.status(401).json({ error: "session_revoked" });
    }

    req.user = {
      sub: String(user.id),
      role: user.role,
      name: user.name,
      email: user.email,
      purpose: payload.purpose || null,
      tokenVersion: user.token_version
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}

function requirePurpose(purpose) {
  return (req, res, next) => {
    if (!req.user || req.user.purpose !== purpose) {
      return res.status(403).json({ error: "invalid_token_purpose" });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole, requirePurpose };
