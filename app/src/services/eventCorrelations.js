const { pool } = require("../db");
const {
  canUserEditEvent,
  getBitacoraViewScope,
  resolveActorId
} = require("./authorization");
const { buildGroupScopeCondition } = require("./groups");

const RELATION_TYPES = Object.freeze([
  "seguimiento",
  "reincidencia",
  "relacionado",
  "actualizacion",
  "causa_raiz",
  "evidencia",
  "otro"
]);

const RELATION_TYPE_SET = new Set(RELATION_TYPES);
const SEARCH_LIMIT_MAX = 20;

class EventCorrelationError extends Error {
  constructor(status, code, details = null) {
    super(code);
    this.name = "EventCorrelationError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizePositiveInteger(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function normalizeRelationType(value) {
  const normalized = String(value || "relacionado")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  return RELATION_TYPE_SET.has(normalized) ? normalized : null;
}

function normalizeNote(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function normalizeSearchText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildEventVisibilityClause(user, alias, params) {
  const scope = getBitacoraViewScope(user);
  const groupClause = buildGroupScopeCondition({ alias, user, params, action: "view" });
  if (scope.canViewAny) {
    return groupClause;
  }

  if (scope.canViewOwnCreated) {
    const actorId = resolveActorId(user);
    if (!Number.isInteger(actorId) || actorId <= 0) {
      return "FALSE";
    }
    const actorIndex = params.push(actorId);
    return `(${groupClause} AND ${alias}.encargado_id = $${actorIndex})`;
  }

  return "FALSE";
}

function mapEventRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    fecha: row.fecha,
    descripcionActividad: row.descripcionActividad || "",
    observacion: row.observacion || "",
    prioridad: row.prioridad || "media",
    templateId: row.templateId === null || row.templateId === undefined ? null : Number(row.templateId),
    templateName: row.templateName || null,
    encargadoId: Number(row.encargadoId || 0) || null,
    groupId: Number(row.groupId || row.group_id || 0) || null,
    groupName: row.groupName || null,
    groupSlug: row.groupSlug || null,
    encargado: row.encargado || "Usuario eliminado",
    encargadoEmail: row.encargadoEmail || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null
  };
}

async function getVisibleEventById(eventId, user, client = pool) {
  const normalizedEventId = normalizePositiveInteger(eventId);
  if (!normalizedEventId) {
    return null;
  }

  const params = [normalizedEventId];
  const visibilityClause = buildEventVisibilityClause(user, "e", params);
  const result = await client.query(
    `
      SELECT
        e.id,
        e.fecha,
        e.descripcion_actividad AS "descripcionActividad",
        e.observacion,
        e.prioridad,
        e.template_id AS "templateId",
        e.group_id AS "groupId",
        e.created_at AS "createdAt",
        e.updated_at AS "updatedAt",
        t.name AS "templateName",
        g.name AS "groupName",
        g.slug AS "groupSlug",
        u.id AS "encargadoId",
        CASE
          WHEN u.id IS NULL THEN 'Usuario eliminado'
          WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
            THEN CONCAT(u.name, ' (Usuario inactivo)')
          ELSE u.name
        END AS encargado,
        u.email AS "encargadoEmail"
      FROM events e
      LEFT JOIN users u ON u.id = e.encargado_id
      LEFT JOIN event_templates t ON t.id = e.template_id
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE e.id = $1
        AND ${visibilityClause}
      LIMIT 1
    `,
    params
  );

  return mapEventRow(result.rows[0]);
}

function mapCorrelationRow(row, user) {
  const relationType = row.relationType || "relacionado";
  const relatedEvent = mapEventRow({
    id: row.relatedEventId,
    fecha: row.relatedFecha,
    descripcionActividad: row.relatedDescripcionActividad,
    observacion: row.relatedObservacion,
    prioridad: row.relatedPrioridad,
    templateId: row.relatedTemplateId,
    templateName: row.relatedTemplateName,
    groupId: row.relatedGroupId,
    groupName: row.relatedGroupName,
    groupSlug: row.relatedGroupSlug,
    encargadoId: row.relatedEncargadoId,
    encargado: row.relatedEncargado,
    encargadoEmail: row.relatedEncargadoEmail,
    createdAt: row.relatedCreatedAt,
    updatedAt: row.relatedUpdatedAt
  });

  return {
    id: Number(row.id),
    sourceEventId: Number(row.sourceEventId),
    targetEventId: Number(row.targetEventId),
    direction: row.direction,
    relationType,
    note: row.note || "",
    createdAt: row.createdAt,
    createdBy: row.createdBy
      ? {
          id: Number(row.createdBy),
          name: row.createdByName || "Usuario eliminado"
        }
      : {
          id: null,
          name: "Usuario eliminado"
        },
    relatedEvent,
    permissions: {
      canDelete: canUserEditEvent(user, {
        encargadoId: Number(row.sourceOwnerId || 0),
        groupId: Number(row.sourceGroupId || 0)
      })
    }
  };
}

async function listEventCorrelations({ eventId, user, client = pool } = {}) {
  const anchor = await getVisibleEventById(eventId, user, client);
  if (!anchor) {
    throw new EventCorrelationError(404, "event_not_found");
  }

  const params = [anchor.id];
  const relatedVisibilityClause = buildEventVisibilityClause(user, "re", params);
  const result = await client.query(
    `
      SELECT
        c.id,
        c.source_event_id AS "sourceEventId",
        c.target_event_id AS "targetEventId",
        c.relation_type AS "relationType",
        c.note,
        c.created_by AS "createdBy",
        c.created_at AS "createdAt",
        CASE
          WHEN c.source_event_id = $1 THEN 'outgoing'
          ELSE 'incoming'
        END AS direction,
        se.encargado_id AS "sourceOwnerId",
        se.group_id AS "sourceGroupId",
        cu.name AS "createdByName",
        re.id AS "relatedEventId",
        re.fecha AS "relatedFecha",
        re.descripcion_actividad AS "relatedDescripcionActividad",
        re.observacion AS "relatedObservacion",
        re.prioridad AS "relatedPrioridad",
        re.template_id AS "relatedTemplateId",
        re.group_id AS "relatedGroupId",
        re.created_at AS "relatedCreatedAt",
        re.updated_at AS "relatedUpdatedAt",
        rt.name AS "relatedTemplateName",
        rg.name AS "relatedGroupName",
        rg.slug AS "relatedGroupSlug",
        ru.id AS "relatedEncargadoId",
        CASE
          WHEN ru.id IS NULL THEN 'Usuario eliminado'
          WHEN ru.is_active = FALSE OR ru.deleted_at IS NOT NULL
            THEN CONCAT(ru.name, ' (Usuario inactivo)')
          ELSE ru.name
        END AS "relatedEncargado",
        ru.email AS "relatedEncargadoEmail"
      FROM event_correlations c
      JOIN events se ON se.id = c.source_event_id
      JOIN events re
        ON re.id = CASE
          WHEN c.source_event_id = $1 THEN c.target_event_id
          ELSE c.source_event_id
        END
      LEFT JOIN users cu ON cu.id = c.created_by
      LEFT JOIN users ru ON ru.id = re.encargado_id
      LEFT JOIN event_templates rt ON rt.id = re.template_id
      LEFT JOIN groups rg ON rg.id = re.group_id
      WHERE c.deleted_at IS NULL
        AND (c.source_event_id = $1 OR c.target_event_id = $1)
        AND ${relatedVisibilityClause}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 100
    `,
    params
  );

  const correlations = result.rows.map((row) => mapCorrelationRow(row, user));
  return {
    event: anchor,
    outgoing: correlations.filter((item) => item.direction === "outgoing"),
    incoming: correlations.filter((item) => item.direction === "incoming"),
    all: correlations
  };
}

async function searchCorrelatableEvents({
  user,
  sourceEventId = null,
  q = "",
  limit = 10,
  client = pool
} = {}) {
  const normalizedSourceId = normalizePositiveInteger(sourceEventId);
  if (normalizedSourceId) {
    const source = await getVisibleEventById(normalizedSourceId, user, client);
    if (!source) {
      throw new EventCorrelationError(404, "event_not_found");
    }
  }

  const safeLimit = Math.min(SEARCH_LIMIT_MAX, Math.max(1, Number(limit) || 10));
  const searchText = normalizeSearchText(q);
  const params = [];
  const whereParts = [];
  const visibilityClause = buildEventVisibilityClause(user, "e", params);
  whereParts.push(visibilityClause);

  if (normalizedSourceId) {
    const sourceIndex = params.push(normalizedSourceId);
    whereParts.push(`e.id <> $${sourceIndex}`);
  }

  if (searchText) {
    const likeIndex = params.push(`%${searchText.toLowerCase()}%`);
    const idCandidate = normalizePositiveInteger(searchText);
    if (idCandidate) {
      const idIndex = params.push(idCandidate);
      whereParts.push(
        `(e.id = $${idIndex} OR LOWER(e.descripcion_actividad) LIKE $${likeIndex} OR LOWER(e.observacion) LIKE $${likeIndex} OR LOWER(e.prioridad) LIKE $${likeIndex} OR LOWER(u.name) LIKE $${likeIndex} OR LOWER(u.email) LIKE $${likeIndex})`
      );
    } else {
      whereParts.push(
        `(LOWER(e.descripcion_actividad) LIKE $${likeIndex} OR LOWER(e.observacion) LIKE $${likeIndex} OR LOWER(e.prioridad) LIKE $${likeIndex} OR LOWER(u.name) LIKE $${likeIndex} OR LOWER(u.email) LIKE $${likeIndex})`
      );
    }
  }

  const limitIndex = params.push(safeLimit);
  const result = await client.query(
    `
      SELECT
        e.id,
        e.fecha,
        e.descripcion_actividad AS "descripcionActividad",
        e.observacion,
        e.prioridad,
        e.template_id AS "templateId",
        e.group_id AS "groupId",
        e.created_at AS "createdAt",
        e.updated_at AS "updatedAt",
        t.name AS "templateName",
        g.name AS "groupName",
        g.slug AS "groupSlug",
        u.id AS "encargadoId",
        CASE
          WHEN u.id IS NULL THEN 'Usuario eliminado'
          WHEN u.is_active = FALSE OR u.deleted_at IS NOT NULL
            THEN CONCAT(u.name, ' (Usuario inactivo)')
          ELSE u.name
        END AS encargado,
        u.email AS "encargadoEmail"
      FROM events e
      LEFT JOIN users u ON u.id = e.encargado_id
      LEFT JOIN event_templates t ON t.id = e.template_id
      LEFT JOIN groups g ON g.id = e.group_id
      WHERE ${whereParts.join(" AND ")}
      ORDER BY e.fecha DESC, e.created_at DESC, e.id DESC
      LIMIT $${limitIndex}
    `,
    params
  );

  return result.rows.map(mapEventRow);
}

async function createEventCorrelation({
  sourceEventId,
  targetEventId,
  relationType,
  note,
  user,
  client = pool
} = {}) {
  const sourceId = normalizePositiveInteger(sourceEventId);
  const targetId = normalizePositiveInteger(targetEventId);
  if (!sourceId || !targetId) {
    throw new EventCorrelationError(400, "validation_error");
  }

  if (sourceId === targetId) {
    throw new EventCorrelationError(400, "correlation_self_not_allowed");
  }

  const normalizedRelationType = normalizeRelationType(relationType);
  if (!normalizedRelationType) {
    throw new EventCorrelationError(400, "invalid_relation_type");
  }

  const source = await getVisibleEventById(sourceId, user, client);
  if (!source) {
    throw new EventCorrelationError(404, "event_not_found");
  }

  if (!canUserEditEvent(user, source)) {
    throw new EventCorrelationError(403, "forbidden");
  }

  const target = await getVisibleEventById(targetId, user, client);
  if (!target) {
    throw new EventCorrelationError(404, "target_event_not_found");
  }

  try {
    const actorId = resolveActorId(user);
    const result = await client.query(
      `
        INSERT INTO event_correlations (
          source_event_id,
          target_event_id,
          relation_type,
          note,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          source_event_id AS "sourceEventId",
          target_event_id AS "targetEventId",
          relation_type AS "relationType",
          note,
          created_by AS "createdBy",
          created_at AS "createdAt"
      `,
      [
        source.id,
        target.id,
        normalizedRelationType,
        normalizeNote(note),
        Number.isInteger(actorId) && actorId > 0 ? actorId : null
      ]
    );

    return {
      correlation: result.rows[0],
      source,
      target
    };
  } catch (error) {
    if (error?.code === "23505") {
      throw new EventCorrelationError(409, "correlation_already_exists");
    }
    throw error;
  }
}

async function deleteEventCorrelation({ eventId, correlationId, user, client = pool } = {}) {
  const normalizedEventId = normalizePositiveInteger(eventId);
  const normalizedCorrelationId = normalizePositiveInteger(correlationId);
  if (!normalizedEventId || !normalizedCorrelationId) {
    throw new EventCorrelationError(400, "validation_error");
  }

  const result = await client.query(
    `
      SELECT
        c.id,
        c.source_event_id AS "sourceEventId",
        c.target_event_id AS "targetEventId",
        c.relation_type AS "relationType",
        c.note,
        se.encargado_id AS "sourceOwnerId",
        se.group_id AS "sourceGroupId",
        te.encargado_id AS "targetOwnerId"
      FROM event_correlations c
      JOIN events se ON se.id = c.source_event_id
      JOIN events te ON te.id = c.target_event_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND (c.source_event_id = $2 OR c.target_event_id = $2)
      LIMIT 1
    `,
    [normalizedCorrelationId, normalizedEventId]
  );

  if (result.rowCount === 0) {
    throw new EventCorrelationError(404, "correlation_not_found");
  }

  const correlation = result.rows[0];
  const source = await getVisibleEventById(correlation.sourceEventId, user, client);
  const target = await getVisibleEventById(correlation.targetEventId, user, client);
  if (!source || !target) {
    throw new EventCorrelationError(404, "correlation_not_found");
  }

  if (!canUserEditEvent(user, {
    encargadoId: Number(correlation.sourceOwnerId || 0),
    groupId: Number(correlation.sourceGroupId || 0)
  })) {
    throw new EventCorrelationError(403, "forbidden");
  }

  await client.query(
    `
      UPDATE event_correlations
      SET deleted_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [normalizedCorrelationId]
  );

  return {
    correlation,
    source,
    target
  };
}

module.exports = {
  EventCorrelationError,
  RELATION_TYPES,
  createEventCorrelation,
  deleteEventCorrelation,
  getVisibleEventById,
  listEventCorrelations,
  normalizeRelationType,
  searchCorrelatableEvents
};
