const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { config } = require("../config");

const jwtCommonOptions = {
  issuer: config.jwtIssuer,
  audience: config.jwtAudience,
  algorithm: "HS256"
};

function durationToMs(duration) {
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return duration * 1000;
  }

  if (typeof duration !== "string") {
    return null;
  }

  const match = duration.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }[unit];

  return amount * factor;
}

function getCookieSameSite() {
  const sameSite = String(config.cookieSameSite || "strict").toLowerCase();
  if (sameSite === "lax" || sameSite === "none") {
    return sameSite;
  }
  return "strict";
}

function buildCookieOptions(maxAgeMs) {
  const options = {
    httpOnly: true,
    secure: Boolean(config.cookieSecure),
    sameSite: getCookieSameSite(),
    path: "/",
    maxAge: maxAgeMs
  };

  if (config.cookieDomain) {
    options.domain = config.cookieDomain;
  }

  return options;
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      name: user.name,
      tokenVersion: user.token_version
    },
    config.jwtSecret,
    {
      ...jwtCommonOptions,
      expiresIn: config.accessTokenExpiresIn
    }
  );
}

function createRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      tokenVersion: user.token_version,
      tokenId,
      purpose: "refresh"
    },
    config.jwtSecret,
    {
      ...jwtCommonOptions,
      expiresIn: config.refreshTokenExpiresIn
    }
  );

  const refreshMs = durationToMs(config.refreshTokenExpiresIn) || 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + refreshMs);
  return { token, tokenId, expiresAt };
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, jwtCommonOptions);
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, jwtCommonOptions);
  if (payload.purpose !== "refresh") {
    throw new Error("invalid_refresh_purpose");
  }
  return payload;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAccessCookieOptions() {
  const accessMs = durationToMs(config.accessTokenExpiresIn) || 15 * 60 * 1000;
  return buildCookieOptions(accessMs);
}

function getRefreshCookieOptions() {
  const refreshMs = durationToMs(config.refreshTokenExpiresIn) || 7 * 24 * 60 * 60 * 1000;
  return buildCookieOptions(refreshMs);
}

module.exports = {
  durationToMs,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getAccessCookieOptions,
  getRefreshCookieOptions
};
