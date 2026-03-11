const express = require("express");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../db");
const { config } = require("../config");
const { authenticate, requirePurpose } = require("../middleware/auth");
const { validatePasswordPolicy } = require("../services/passwordPolicy");
const { createAuditLog } = require("../services/audit");
const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions
} = require("../services/tokens");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().regex(/^[0-9]{6}$/).optional()
});

const mfaEnableSchema = z.object({
  token: z.string().regex(/^[0-9]{6}$/)
});

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(1)
});

function createMfaSetupToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      purpose: "mfa_setup",
      tokenVersion: user.token_version
    },
    config.jwtSecret,
    {
      expiresIn: "10m",
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      algorithm: "HS256"
    }
  );
}

function getRefreshTokenFromRequest(req) {
  const cookieToken = req.cookies?.[config.refreshCookieName];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return null;
}

async function registerFailedAttempt(user) {
  await pool.query(
    `
      UPDATE users
      SET
        failed_attempts = CASE
          WHEN failed_attempts + 1 >= $2 THEN 0
          ELSE failed_attempts + 1
        END,
        lock_until = CASE
          WHEN failed_attempts + 1 >= $2 THEN NOW() + ($3::text || ' minutes')::interval
          ELSE lock_until
        END
      WHERE id = $1
    `,
    [user.id, config.maxFailedAttempts, config.lockMinutes]
  );
}

async function resetLockState(userId) {
  await pool.query("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = $1", [userId]);
}

async function persistRefreshToken(userId, refreshTokenObj) {
  await pool.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, token_id, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [
      userId,
      hashToken(refreshTokenObj.token),
      refreshTokenObj.tokenId,
      refreshTokenObj.expiresAt.toISOString()
    ]
  );
}

async function revokeRefreshTokenById(tokenId) {
  if (!tokenId) {
    return;
  }

  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, NOW()),
          last_used_at = NOW()
      WHERE token_id = $1
    `,
    [tokenId]
  );
}

function setSessionCookies(res, accessToken, refreshToken) {
  res.cookie(config.authCookieName, accessToken, getAccessCookieOptions());
  res.cookie(config.refreshCookieName, refreshToken, getRefreshCookieOptions());
}

function clearSessionCookies(res) {
  res.clearCookie(config.authCookieName, getAccessCookieOptions());
  res.clearCookie(config.refreshCookieName, getRefreshCookieOptions());
}

async function issueSession({ user, req, res, auditAction = "auth.session_created" }) {
  const accessToken = createAccessToken(user);
  const refreshTokenObj = createRefreshToken(user);

  await persistRefreshToken(user.id, refreshTokenObj);
  setSessionCookies(res, accessToken, refreshTokenObj.token);

  await createAuditLog({
    userId: user.id,
    action: auditAction,
    entity: "auth",
    entityId: user.id,
    metadata: {
      role: user.role
    },
    req
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, password_hash, failed_attempts, lock_until, mfa_enabled, mfa_secret,
               token_version
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [payload.email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = userResult.rows[0];

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({
        error: "account_locked",
        lockedUntil: user.lock_until
      });
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.password_hash);
    if (!passwordMatch) {
      await registerFailedAttempt(user);
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (user.role === "admin" && !user.mfa_enabled) {
      await resetLockState(user.id);
      const setupToken = createMfaSetupToken(user);
      return res.status(403).json({
        error: "mfa_setup_required",
        message: "El administrador debe activar MFA antes de acceder.",
        setupToken
      });
    }

    if (user.mfa_enabled) {
      if (!user.mfa_secret) {
        await registerFailedAttempt(user);
        return res.status(401).json({ error: "invalid_mfa_setup" });
      }

      if (!payload.mfaToken) {
        return res.status(401).json({ error: "mfa_token_required" });
      }

      const mfaValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: "base32",
        token: payload.mfaToken,
        window: 1
      });

      if (!mfaValid) {
        await registerFailedAttempt(user);
        return res.status(401).json({ error: "invalid_mfa_token" });
      }
    }

    await resetLockState(user.id);
    const session = await issueSession({ user, req, res, auditAction: "auth.login_success" });

    return res.json({
      ...session,
      tokenType: "cookie"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    if (!config.allowPublicRegistration) {
      return res.status(403).json({ error: "registration_disabled" });
    }

    const payload = registerSchema.parse(req.body);

    const policyResult = validatePasswordPolicy(payload.password);
    if (!policyResult.valid) {
      return res.status(400).json({
        error: "weak_password",
        details: policyResult.errors
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const insertResult = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'funcionario')
        RETURNING id, name, email, role, token_version
      `,
      [payload.name, payload.email, passwordHash]
    );

    const user = insertResult.rows[0];
    const session = await issueSession({ user, req, res, auditAction: "auth.register_success" });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      ...session,
      tokenType: "cookie"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "email_already_exists" });
    }
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ error: "refresh_token_required" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (_error) {
      return res.status(401).json({ error: "invalid_refresh_token" });
    }

    const tokenId = payload.tokenId;
    const tokenResult = await pool.query(
      `
        SELECT id, user_id, token_hash, expires_at, revoked_at
        FROM refresh_tokens
        WHERE token_id = $1
        LIMIT 1
      `,
      [tokenId]
    );

    if (tokenResult.rowCount === 0) {
      return res.status(401).json({ error: "invalid_refresh_token" });
    }

    const storedToken = tokenResult.rows[0];
    if (storedToken.revoked_at || new Date(storedToken.expires_at) <= new Date()) {
      return res.status(401).json({ error: "refresh_token_expired" });
    }

    if (storedToken.token_hash !== hashToken(refreshToken)) {
      return res.status(401).json({ error: "invalid_refresh_token" });
    }

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, token_version
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [storedToken.user_id]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "invalid_refresh_token" });
    }

    const user = userResult.rows[0];
    if (Number(payload.tokenVersion) !== Number(user.token_version)) {
      await revokeRefreshTokenById(tokenId);
      return res.status(401).json({ error: "session_revoked" });
    }

    await revokeRefreshTokenById(tokenId);
    const session = await issueSession({ user, req, res, auditAction: "auth.refresh_success" });

    return res.json({
      ...session,
      tokenType: "cookie"
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await revokeRefreshTokenById(payload.tokenId);
        await createAuditLog({
          userId: payload.sub,
          action: "auth.logout",
          entity: "auth",
          entityId: payload.sub,
          req
        });
      } catch (_error) {
        // No-op: limpiar cookies aunque el token no sea valido.
      }
    }

    clearSessionCookies(res);
    return res.json({ message: "Sesion cerrada" });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/setup", authenticate, requirePurpose("mfa_setup"), async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `SELECT id, email, role, token_version FROM users WHERE id = $1 LIMIT 1`,
      [req.user.sub]
    );

    if (userResult.rowCount === 0 || userResult.rows[0].role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    const user = userResult.rows[0];
    const secret = speakeasy.generateSecret({
      name: `Bitacora (${user.email})`,
      issuer: "Bitacora"
    });

    await pool.query("UPDATE users SET mfa_temp_secret = $2 WHERE id = $1", [user.id, secret.base32]);

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    return res.json({
      otpauthUrl: secret.otpauth_url,
      manualKey: secret.base32,
      qrDataUrl
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/enable", authenticate, requirePurpose("mfa_setup"), async (req, res, next) => {
  try {
    const payload = mfaEnableSchema.parse(req.body);

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, mfa_temp_secret, token_version
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const user = userResult.rows[0];
    if (!user.mfa_temp_secret) {
      return res.status(400).json({ error: "mfa_setup_not_started" });
    }

    const tokenValid = speakeasy.totp.verify({
      secret: user.mfa_temp_secret,
      encoding: "base32",
      token: payload.token,
      window: 1
    });

    if (!tokenValid) {
      return res.status(401).json({ error: "invalid_mfa_token" });
    }

    await pool.query(
      `
        UPDATE users
        SET mfa_enabled = TRUE,
            mfa_secret = mfa_temp_secret,
            mfa_temp_secret = NULL
        WHERE id = $1
      `,
      [user.id]
    );

    const session = await issueSession({ user, req, res, auditAction: "auth.mfa_enabled" });
    return res.json({
      message: "MFA habilitado correctamente",
      ...session,
      tokenType: "cookie"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

module.exports = { authRouter: router };
