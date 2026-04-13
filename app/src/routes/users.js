const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");
const { authenticate, requireRole } = require("../middleware/auth");
const { validatePasswordPolicy } = require("../services/passwordPolicy");
const { validateFullName } = require("../services/namePolicy");
const { createAuditLog } = require("../services/audit");
const { canUserManageUsers, canUserViewUsers } = require("../services/authorization");

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "supervisor", "funcionario"]).default("funcionario")
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(1)
});
const updateRoleSchema = z.object({
  role: z.enum(["admin", "supervisor", "funcionario"])
});

const selfPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1)
});

function ensureCanViewUsersOrForbidden(req, res) {
  if (!canUserViewUsers(req.user)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

function ensureCanManageUsersOrForbidden(req, res) {
  if (!canUserManageUsers(req.user)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function resolveStoredAttachmentPath(storedName) {
  const normalizedStoredName = path.basename(String(storedName || ""));
  if (!normalizedStoredName || normalizedStoredName !== String(storedName || "")) {
    return null;
  }

  const uploadsRoot = path.resolve(config.uploadDir);
  const filePath = path.resolve(uploadsRoot, normalizedStoredName);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

async function removeStoredFiles(storedNames) {
  const uniqueNames = Array.from(
    new Set((Array.isArray(storedNames) ? storedNames : []).map((value) => String(value || "").trim()))
  ).filter(Boolean);

  for (const storedName of uniqueNames) {
    const filePath = resolveStoredAttachmentPath(storedName);
    if (!filePath) {
      continue;
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.warn({ err: error, storedName }, "No se pudo eliminar adjunto fisico");
      }
    }
  }
}

router.post("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageUsersOrForbidden(req, res)) {
      return;
    }

    const payload = createUserSchema.parse(req.body);
    const email = normalizeEmail(payload.email);
    const nameResult = validateFullName(payload.name);
    if (!nameResult.valid) {
      return res.status(400).json({ error: "invalid_name" });
    }

    const policyResult = validatePasswordPolicy(payload.password, {
      email,
      name: nameResult.value
    });
    if (!policyResult.valid) {
      return res.status(400).json({
        error: "weak_password"
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const insertResult = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at
      `,
      [nameResult.value, email, passwordHash, payload.role]
    );

    await createAuditLog({
      userId: req.user.sub,
      action: "users.created",
      entity: "user",
      entityId: insertResult.rows[0].id,
      metadata: { role: payload.role },
      req
    });

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "email_already_exists" });
    }
    return next(error);
  }
});

router.get("/", authenticate, requireRole(["admin", "supervisor"]), async (req, res, next) => {
  try {
    if (!ensureCanViewUsersOrForbidden(req, res)) {
      return;
    }

    const result = await pool.query(
      `
        SELECT id, name, email, role, mfa_enabled, created_at
        FROM users
        ORDER BY id ASC
      `
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.patch("/me/password", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = selfPasswordSchema.parse(req.body);

    const currentUserResult = await pool.query(
      `
        SELECT id, name, email, role, password_hash
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.sub]
    );

    if (currentUserResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const currentUser = currentUserResult.rows[0];
    const currentPasswordOk = await bcrypt.compare(payload.currentPassword, currentUser.password_hash);
    if (!currentPasswordOk) {
      return res.status(401).json({ error: "invalid_current_password" });
    }

    const policyResult = validatePasswordPolicy(payload.newPassword, {
      email: currentUser.email,
      name: currentUser.name
    });
    if (!policyResult.valid) {
      return res.status(400).json({
        error: "weak_password"
      });
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await pool.query(
      `
        UPDATE users
        SET password_hash = $2,
            token_version = token_version + 1,
            failed_attempts = 0,
            lock_until = NULL
        WHERE id = $1
      `,
      [currentUser.id, passwordHash]
    );

    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [currentUser.id]);

    await createAuditLog({
      userId: req.user.sub,
      action: "users.self_password_changed",
      entity: "user",
      entityId: currentUser.id,
      metadata: { targetUserId: currentUser.id },
      req
    });

    return res.json({
      message: "Contrasena actualizada correctamente. Debes iniciar sesion nuevamente.",
      forceReauth: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/:id/password", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageUsersOrForbidden(req, res)) {
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const payload = resetPasswordSchema.parse(req.body);
    const targetUserResult = await pool.query(
      `
        SELECT id, name, email
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (targetUserResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const targetUser = targetUserResult.rows[0];
    const policyResult = validatePasswordPolicy(payload.newPassword, {
      email: targetUser.email,
      name: targetUser.name
    });
    if (!policyResult.valid) {
      return res.status(400).json({
        error: "weak_password"
      });
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    const updateResult = await pool.query(
      `
        UPDATE users
        SET password_hash = $2,
            token_version = token_version + 1,
            failed_attempts = 0,
            lock_until = NULL
        WHERE id = $1
        RETURNING id, name, email, role, token_version, updated_at
      `,
      [userId, passwordHash]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "users.password_reset",
      entity: "user",
      entityId: userId,
      metadata: { targetUserId: userId },
      req
    });

    return res.json({
      message: "Contrasena actualizada correctamente",
      user: {
        id: updateResult.rows[0].id,
        name: updateResult.rows[0].name,
        email: updateResult.rows[0].email,
        role: updateResult.rows[0].role,
        updated_at: updateResult.rows[0].updated_at
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/:id/role", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageUsersOrForbidden(req, res)) {
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const payload = updateRoleSchema.parse(req.body);
    const actorUserId = Number(req.user?.sub);

    const targetResult = await pool.query(
      `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const targetUser = targetResult.rows[0];

    if (userId === actorUserId && payload.role !== "admin") {
      return res.status(400).json({ error: "cannot_change_own_role" });
    }

    if (targetUser.role === "admin" && payload.role !== "admin") {
      const adminCountResult = await pool.query(
        "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'"
      );
      const adminTotal = Number(adminCountResult.rows[0]?.total || 0);
      if (adminTotal <= 1) {
        return res.status(400).json({ error: "last_admin_not_allowed" });
      }
    }

    const updateResult = await pool.query(
      `
        UPDATE users
        SET role = $2
        WHERE id = $1
        RETURNING id, name, email, role, updated_at
      `,
      [userId, payload.role]
    );

    await createAuditLog({
      userId: req.user.sub,
      action: "users.role_updated",
      entity: "user",
      entityId: userId,
      metadata: {
        targetUserId: userId,
        previousRole: targetUser.role,
        newRole: payload.role
      },
      req
    });

    return res.json({
      message: "Rol actualizado correctamente",
      user: updateResult.rows[0]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.post("/:id/unlock", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanManageUsersOrForbidden(req, res)) {
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const unlockResult = await pool.query(
      `
        UPDATE users
        SET failed_attempts = 0,
            lock_until = NULL
        WHERE id = $1
        RETURNING id, name, email, role
      `,
      [userId]
    );

    if (unlockResult.rowCount === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "users.unlocked",
      entity: "user",
      entityId: userId,
      metadata: { targetUserId: userId },
      req
    });

    return res.json({
      message: "Usuario desbloqueado correctamente",
      user: unlockResult.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", authenticate, requireRole(["admin"]), async (req, res, next) => {
  if (!ensureCanManageUsersOrForbidden(req, res)) {
    return;
  }

  const userId = Number(req.params.id);
  const actorUserId = Number(req.user?.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  if (userId === actorUserId) {
    return res.status(400).json({ error: "cannot_delete_current_user" });
  }

  const client = await pool.connect();
  let txStarted = false;
  try {
    await client.query("BEGIN");
    txStarted = true;

    const targetResult = await client.query(
      `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (targetResult.rowCount === 0) {
      await client.query("ROLLBACK");
      txStarted = false;
      return res.status(404).json({ error: "user_not_found" });
    }

    const targetUser = targetResult.rows[0];
    if (targetUser.role === "admin") {
      const adminCountResult = await client.query(
        "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'"
      );
      const adminTotal = Number(adminCountResult.rows[0]?.total || 0);
      if (adminTotal <= 1) {
        await client.query("ROLLBACK");
        txStarted = false;
        return res.status(400).json({ error: "last_admin_not_allowed" });
      }
    }

    const attachmentsResult = await client.query(
      `
        SELECT stored_name
        FROM event_attachments
        WHERE event_id IN (SELECT id FROM events WHERE encargado_id = $1)
           OR uploaded_by = $1
      `,
      [userId]
    );

    await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);

    const attachmentsDeleteResult = await client.query(
      `
        DELETE FROM event_attachments
        WHERE event_id IN (SELECT id FROM events WHERE encargado_id = $1)
           OR uploaded_by = $1
      `,
      [userId]
    );

    const eventsDeleteResult = await client.query("DELETE FROM events WHERE encargado_id = $1", [userId]);

    const userDeleteResult = await client.query(
      `
        DELETE FROM users
        WHERE id = $1
        RETURNING id, email, role
      `,
      [userId]
    );

    await client.query("COMMIT");
    txStarted = false;

    await removeStoredFiles(attachmentsResult.rows.map((row) => row.stored_name));

    await createAuditLog({
      userId: req.user.sub,
      action: "users.deleted",
      entity: "user",
      entityId: userId,
      metadata: {
        targetEmail: userDeleteResult.rows[0].email,
        targetRole: userDeleteResult.rows[0].role,
        deletedEvents: eventsDeleteResult.rowCount,
        deletedAttachments: attachmentsDeleteResult.rowCount
      },
      req
    });

    return res.json({
      message: "Usuario eliminado correctamente",
      deleted: {
        userId,
        events: eventsDeleteResult.rowCount,
        attachments: attachmentsDeleteResult.rowCount
      }
    });
  } catch (error) {
    if (txStarted) {
      await client.query("ROLLBACK");
    }
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = { usersRouter: router };










