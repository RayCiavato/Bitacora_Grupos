const { pool } = require("../db");
const { logger } = require("../logger");

function toSafeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

async function createAuditLog({ userId = null, action, entity, entityId = null, metadata, req }) {
  if (!action || !entity) {
    return;
  }

  try {
    await pool.query(
      `
        INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      `,
      [
        userId ? Number(userId) : null,
        action,
        entity,
        entityId ? Number(entityId) : null,
        JSON.stringify(toSafeMetadata(metadata)),
        req?.ip || null,
        req?.headers?.["user-agent"] || null
      ]
    );
  } catch (error) {
    logger.warn({ err: error, action, entity }, "No se pudo registrar auditoria");
  }
}

module.exports = { createAuditLog };
