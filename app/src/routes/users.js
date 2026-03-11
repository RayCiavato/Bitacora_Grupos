const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { pool } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validatePasswordPolicy } = require("../services/passwordPolicy");
const { createAuditLog } = require("../services/audit");

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

router.post("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);

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
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at
      `,
      [payload.name, payload.email, passwordHash, payload.role]
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
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "email_already_exists" });
    }
    return next(error);
  }
});

router.get("/", authenticate, requireRole(["admin", "supervisor"]), async (_req, res, next) => {
  try {
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

router.patch("/:id/password", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const payload = resetPasswordSchema.parse(req.body);
    const policyResult = validatePasswordPolicy(payload.newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({
        error: "weak_password",
        details: policyResult.errors
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
      return res.status(400).json({ error: "validation_error", details: error.flatten() });
    }
    return next(error);
  }
});

module.exports = { usersRouter: router };
