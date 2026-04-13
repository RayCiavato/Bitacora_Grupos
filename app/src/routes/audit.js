const express = require("express");
const { z } = require("zod");
const { pool } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { canUserAccessPanel } = require("../services/authorization");

const router = express.Router();

const querySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  action: z.string().max(80).optional(),
  userId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

router.get("/", authenticate, requireRole(["admin", "supervisor"]), async (req, res, next) => {
  try {
    if (!canUserAccessPanel(req.user, "auditoria")) {
      return res.status(403).json({ error: "forbidden" });
    }

    const query = querySchema.parse(req.query);

    const where = [];
    const params = [];

    if (query.from) {
      const index = params.push(`${query.from}T00:00:00`);
      where.push(`a.created_at >= $${index}::timestamptz`);
    }
    if (query.to) {
      const index = params.push(`${query.to}T23:59:59.999`);
      where.push(`a.created_at <= $${index}::timestamptz`);
    }
    if (query.action) {
      const index = params.push(query.action);
      where.push(`a.action = $${index}`);
    }
    if (query.userId) {
      const index = params.push(query.userId);
      where.push(`a.user_id = $${index}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM audit_logs a
        ${whereSql}
      `,
      params
    );

    const total = Number(countResult.rows[0]?.total || 0);
    const totalPages = total === 0 ? 1 : Math.ceil(total / query.pageSize);
    const page = Math.min(query.page, totalPages);
    const offset = (page - 1) * query.pageSize;

    const dataParams = [...params];
    const limitIndex = dataParams.push(query.pageSize);
    const offsetIndex = dataParams.push(offset);

    const result = await pool.query(
      `
        SELECT
          a.id,
          a.action,
          a.entity,
          a.entity_id AS "entityId",
          a.metadata,
          a.ip_address AS "ipAddress",
          a.user_agent AS "userAgent",
          a.created_at AS "createdAt",
          u.id AS "userId",
          u.name AS "userName",
          u.email AS "userEmail"
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      dataParams
    );

    return res.json({
      items: result.rows,
      pagination: {
        page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { auditRouter: router };