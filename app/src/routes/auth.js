const express = require("express");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const { authenticate, requirePurpose } = require("../middleware/auth");
const { validatePasswordPolicy } = require("../services/passwordPolicy");
const { validateFullName } = require("../services/namePolicy");
const { normalizeEmail, validateRegistrationEmail } = require("../services/emailPolicy");
const { createAuditLog } = require("../services/audit");
const { buildSessionUser } = require("../services/authorization");
const { addUserToGroup, enrichUserWithGroupAccess, getDefaultGroup } = require("../services/groups");
const { getSystemSettings } = require("../services/systemSettings");
const {
  createAccessToken,
  createRefreshToken,
  createCsrfToken,
  hashToken,
  verifyRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  getCsrfCookieOptions
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
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});
const recoverPasswordSchema = z.object({
  email: z.string().email(),
  mfaToken: z.string().regex(/^[0-9]{6}$/),
  newPassword: z.string().min(1)
});

function getRuntimeSessionSettings() {
  const current = getSystemSettings();

  const idleCandidate = Number(current?.session?.idleTimeoutMinutes || config.sessionIdleTimeoutMinutes || 120);
  const idleTimeoutMinutes = Math.min(
    1440,
    Math.max(5, Number.isFinite(idleCandidate) ? Math.trunc(idleCandidate) : 120)
  );

  const warningCandidate = Number(current?.session?.warningMinutes || 5);
  const keepAliveCandidate = Number(current?.session?.keepAliveIntervalMinutes || 5);

  const warningMinutes = Math.min(
    idleTimeoutMinutes - 1,
    Math.max(1, Number.isFinite(warningCandidate) ? Math.trunc(warningCandidate) : 5)
  );

  const keepAliveIntervalMinutes = Math.min(
    idleTimeoutMinutes - 1,
    Math.max(1, Number.isFinite(keepAliveCandidate) ? Math.trunc(keepAliveCandidate) : 5)
  );

  return {
    idleTimeoutMinutes,
    warningMinutes,
    keepAliveIntervalMinutes
  };
}

function resolveTokenLastActivityDate(storedToken) {
  if (storedToken?.last_used_at) {
    const parsed = new Date(storedToken.last_used_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (storedToken?.created_at) {
    const parsed = new Date(storedToken.created_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

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
  if (user?.role === "admin") {
    return;
  }

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
      INSERT INTO refresh_tokens (user_id, token_hash, token_id, expires_at, last_used_at)
      VALUES ($1, $2, $3, $4, NOW())
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

async function revokeAllRefreshTokensForUser(userId) {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, NOW()),
          last_used_at = COALESCE(last_used_at, NOW())
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId]
  );
}

function setSessionCookies(res, accessToken, refreshToken, csrfToken) {
  res.cookie(config.authCookieName, accessToken, getAccessCookieOptions());
  res.cookie(config.refreshCookieName, refreshToken, getRefreshCookieOptions());
  res.cookie(config.csrfCookieName, csrfToken, getCsrfCookieOptions());
}

function cookieOptionsForClear(baseOptions) {
  if (!baseOptions || typeof baseOptions !== "object") {
    return { path: "/" };
  }

  const { maxAge: _maxAge, expires: _expires, ...rest } = baseOptions;
  return rest;
}

function clearSessionCookies(res) {
  res.clearCookie(config.authCookieName, cookieOptionsForClear(getAccessCookieOptions()));
  res.clearCookie(config.refreshCookieName, cookieOptionsForClear(getRefreshCookieOptions()));
  res.clearCookie(config.csrfCookieName, cookieOptionsForClear(getCsrfCookieOptions()));
}

async function issueSession({ user, req, res, auditAction = "auth.session_created" }) {
  const accessToken = createAccessToken(user);
  const refreshTokenObj = createRefreshToken(user);
  const csrfToken = createCsrfToken();

  await persistRefreshToken(user.id, refreshTokenObj);
  setSessionCookies(res, accessToken, refreshTokenObj.token, csrfToken);

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

  const enrichedUser = await enrichUserWithGroupAccess(user);

  return {
    accessToken,
    user: buildSessionUser(enrichedUser)
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const email = normalizeEmail(payload.email);

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, password_hash, failed_attempts, lock_until, mfa_enabled, mfa_secret,
               token_version
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = userResult.rows[0];

    if (user.role !== "admin" && user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({
        error: "account_locked",
        lockedUntil: user.lock_until
      });
    }

    if (user.role === "admin" && (user.lock_until || Number(user.failed_attempts || 0) > 0)) {
      await resetLockState(user.id);
      user.lock_until = null;
      user.failed_attempts = 0;
    }

    const passwordMatch = await bcrypt.compare(payload.password, user.password_hash);
    if (!passwordMatch) {
      await registerFailedAttempt(user);
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if ((config.mfaRequired || user.role === "admin") && !user.mfa_enabled) {
      await resetLockState(user.id);
      const setupToken = createMfaSetupToken(user);
      return res.status(403).json({
        error: "mfa_setup_required",
        message:
          user.role === "admin"
            ? "La cuenta admin debe activar MFA antes de acceder."
            : "Debes activar MFA antes de acceder.",
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
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.post("/register", async (req, res, next) => {
  let email = "";
  try {
    if (!config.allowPublicRegistration) {
      return res.status(403).json({ error: "registration_disabled" });
    }

    const payload = registerSchema.parse(req.body);
    const emailResult = validateRegistrationEmail(payload.email);
    if (!emailResult.valid) {
      return res.status(400).json({ error: emailResult.error });
    }
    email = emailResult.value;
    const nameResult = validateFullName(payload.name);
    if (!nameResult.valid) {
      logger.warn({ email, reasons: nameResult.errors }, "Register rejected by name policy");
      return res.status(400).json({
        error: "invalid_name"
      });
    }

    const normalizedName = nameResult.value;

    const policyResult = validatePasswordPolicy(payload.password, {
      email,
      name: normalizedName
    });
    if (!policyResult.valid) {
      logger.warn({ email, reasons: policyResult.errors }, "Register rejected by password policy");
      return res.status(400).json({
        error: "weak_password"
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const insertResult = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'funcionario')
        RETURNING id, name, email, role, token_version
      `,
      [normalizedName, email, passwordHash]
    );

    const user = insertResult.rows[0];
    const defaultGroup = await getDefaultGroup();
    if (defaultGroup?.id) {
      await addUserToGroup({
        userId: user.id,
        groupId: defaultGroup.id,
        roleInGroup: "miembro"
      });
    }

    const setupToken = createMfaSetupToken(user);
    await createAuditLog({
      userId: user.id,
      action: "auth.register_success",
      entity: "auth",
      entityId: user.id,
      metadata: { role: user.role },
      req
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente. Escanea el QR para activar MFA.",
      setupRequired: true,
      setupToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23505") {
      logger.warn({ email }, "Register failed due to duplicate email");
      return res.status(400).json({ error: "registration_unavailable" });
    }
    return next(error);
  }
});

router.post("/password/recover", async (req, res, next) => {
  let email = "";
  try {
    const payload = recoverPasswordSchema.parse(req.body);
    email = normalizeEmail(payload.email);

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, mfa_enabled, mfa_secret
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [email]
    );

    if (userResult.rowCount === 0) {
      logger.warn({ email }, "Password recover rejected: user not found");
      return res.status(400).json({ error: "recover_failed" });
    }

    const user = userResult.rows[0];

    if (!user.mfa_enabled || !user.mfa_secret) {
      logger.warn({ email, userId: user.id }, "Password recover rejected: MFA not enabled");
      return res.status(400).json({ error: "recover_failed" });
    }

    const mfaValid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token: payload.mfaToken,
      window: 1
    });

    if (!mfaValid) {
      logger.warn({ email, userId: user.id }, "Password recover rejected: invalid MFA token");
      return res.status(400).json({ error: "recover_failed" });
    }

    const policyResult = validatePasswordPolicy(payload.newPassword, {
      email: user.email,
      name: user.name
    });
    if (!policyResult.valid) {
      logger.warn(
        { email, userId: user.id, reasons: policyResult.errors },
        "Password recover rejected by password policy"
      );
      return res.status(400).json({
        error: "weak_password"
      });
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);

    await pool.query(
      `
        UPDATE users
        SET password_hash = $2,
            failed_attempts = 0,
            lock_until = NULL,
            token_version = token_version + 1
        WHERE id = $1
      `,
      [user.id, passwordHash]
    );

    await revokeAllRefreshTokensForUser(user.id);
    clearSessionCookies(res);

    await createAuditLog({
      userId: user.id,
      action: "auth.password_recovered",
      entity: "auth",
      entityId: user.id,
      metadata: { role: user.role },
      req
    });

    return res.json({ message: "Contrasena actualizada correctamente. Ya puedes iniciar sesion." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
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
        SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at
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

    const sessionSettings = getRuntimeSessionSettings();
    const lastActivityAt = resolveTokenLastActivityDate(storedToken);
    const idleTimeoutMs = sessionSettings.idleTimeoutMinutes * 60 * 1000;
    if (!lastActivityAt || Date.now() - lastActivityAt.getTime() > idleTimeoutMs) {
      await revokeRefreshTokenById(tokenId);
      return res.status(401).json({ error: "session_inactive_timeout" });
    }

    if (storedToken.token_hash !== hashToken(refreshToken)) {
      return res.status(401).json({ error: "invalid_refresh_token" });
    }

    const userResult = await pool.query(
      `
        SELECT id, name, email, role, token_version
        FROM users
        WHERE id = $1
          AND is_active = TRUE
          AND deleted_at IS NULL
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
    if (!req.cookies?.[config.csrfCookieName]) {
      res.cookie(config.csrfCookieName, createCsrfToken(), getCsrfCookieOptions());
    }

    const result = await pool.query(
      `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json(buildSessionUser(result.rows[0]));
  } catch (error) {
    return next(error);
  }
});

router.get("/session-config", authenticate, async (_req, res, next) => {
  try {
    const sessionSettings = getRuntimeSessionSettings();
    return res.json({
      session: {
        idleTimeoutMinutes: sessionSettings.idleTimeoutMinutes,
        warningMinutes: sessionSettings.warningMinutes,
        keepAliveIntervalMinutes: sessionSettings.keepAliveIntervalMinutes
      },
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});
router.post("/mfa/setup", authenticate, requirePurpose("mfa_setup"), async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `
        SELECT id, email, role, token_version
        FROM users
        WHERE id = $1
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
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
          AND is_active = TRUE
          AND deleted_at IS NULL
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
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { authRouter: router };
