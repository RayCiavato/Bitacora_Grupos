const express = require("express");
const { z } = require("zod");
const { pool } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const { getSystemSettings } = require("../services/systemSettings");
const { canUserManageTemplates, canUserCreateEvent } = require("../services/authorization");

const router = express.Router();

const templateSchema = z.object({
  name: z.string().trim().min(3).max(160),
  descripcionBase: z.string().trim().min(3).max(3000),
  observacionBase: z.string().trim().min(3).max(3000),
  prioridadDefault: z.enum(["baja", "media", "alta", "observacion"]).default("media"),
  isActive: z.boolean().optional()
});

const templateUpdateSchema = templateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Debe enviar al menos un campo para actualizar."
);

const idSchema = z.object({
  id: z.coerce.number().int().positive()
});

function areTemplatesEnabled() {
  const settings = getSystemSettings();
  return Boolean(settings?.features?.templatesEnabled);
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    const showAll = canUserManageTemplates(req.user);
    const canConsumeTemplates = canUserCreateEvent(req.user);
    if (!showAll && !canConsumeTemplates) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (!areTemplatesEnabled()) {
      return res.json([]);
    }

    const result = await pool.query(
      `
        SELECT
          id,
          name,
          descripcion_base AS "descripcionBase",
          observacion_base AS "observacionBase",
          prioridad_default AS "prioridadDefault",
          is_active AS "isActive",
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM event_templates
        ${showAll ? "" : "WHERE is_active = TRUE"}
        ORDER BY is_active DESC, name ASC
      `
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, requireRole(["admin", "supervisor"]), async (req, res, next) => {
  try {
    if (!canUserManageTemplates(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (!areTemplatesEnabled()) {
      return res.status(403).json({ error: "forbidden" });
    }

    const payload = templateSchema.parse(req.body);
    const result = await pool.query(
      `
        INSERT INTO event_templates (
          name,
          descripcion_base,
          observacion_base,
          prioridad_default,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
        RETURNING
          id,
          name,
          descripcion_base AS "descripcionBase",
          observacion_base AS "observacionBase",
          prioridad_default AS "prioridadDefault",
          is_active AS "isActive",
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        payload.name,
        payload.descripcionBase,
        payload.observacionBase,
        payload.prioridadDefault,
        payload.isActive ?? null,
        req.user.sub
      ]
    );

    await createAuditLog({
      userId: req.user.sub,
      action: "templates.created",
      entity: "template",
      entityId: result.rows[0].id,
      metadata: {
        name: result.rows[0].name
      },
      req
    });

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "template_name_exists" });
    }
    return next(error);
  }
});

router.patch("/:id", authenticate, requireRole(["admin", "supervisor"]), async (req, res, next) => {
  try {
    if (!canUserManageTemplates(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (!areTemplatesEnabled()) {
      return res.status(403).json({ error: "forbidden" });
    }

    const params = idSchema.parse(req.params);
    const payload = templateUpdateSchema.parse(req.body);

    const fields = [];
    const values = [];
    const pushField = (column, value) => {
      const index = values.push(value);
      fields.push(`${column} = $${index}`);
    };

    if (payload.name !== undefined) {
      pushField("name", payload.name);
    }
    if (payload.descripcionBase !== undefined) {
      pushField("descripcion_base", payload.descripcionBase);
    }
    if (payload.observacionBase !== undefined) {
      pushField("observacion_base", payload.observacionBase);
    }
    if (payload.prioridadDefault !== undefined) {
      pushField("prioridad_default", payload.prioridadDefault);
    }
    if (payload.isActive !== undefined) {
      pushField("is_active", payload.isActive);
    }

    const idIndex = values.push(params.id);
    const result = await pool.query(
      `
        UPDATE event_templates
        SET ${fields.join(", ")}
        WHERE id = $${idIndex}
        RETURNING
          id,
          name,
          descripcion_base AS "descripcionBase",
          observacion_base AS "observacionBase",
          prioridad_default AS "prioridadDefault",
          is_active AS "isActive",
          created_by AS "createdBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "template_not_found" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "templates.updated",
      entity: "template",
      entityId: params.id,
      metadata: {
        fields: Object.keys(payload)
      },
      req
    });

    return res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "template_name_exists" });
    }
    return next(error);
  }
});

router.delete(
  "/:id",
  authenticate,
  requireRole(["admin", "supervisor"]),
  async (req, res, next) => {
    try {
      if (!canUserManageTemplates(req.user)) {
        return res.status(403).json({ error: "forbidden" });
      }

      if (!areTemplatesEnabled()) {
        return res.status(403).json({ error: "forbidden" });
      }

      const params = idSchema.parse(req.params);
      const result = await pool.query(
        `
          UPDATE event_templates
          SET is_active = FALSE
          WHERE id = $1
          RETURNING id
        `,
        [params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "template_not_found" });
      }

      await createAuditLog({
        userId: req.user.sub,
        action: "templates.deactivated",
        entity: "template",
        entityId: params.id,
        req
      });

      return res.json({ message: "Plantilla desactivada" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error" });
      }
      return next(error);
    }
  }
);

module.exports = { templatesRouter: router };
