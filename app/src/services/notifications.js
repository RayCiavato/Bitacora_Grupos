const { pool } = require("../db");
const { canUserViewAnyTasks } = require("./authorization");

function resolveUserId(user) {
  const candidate = user?.sub ?? user?.id;
  const normalized = Number(candidate);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function normalizeLimit(limit, fallback = 40) {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 80);
}

function buildTaskScopeWhere(user, firstParamIndex = 1) {
  if (canUserViewAnyTasks(user)) {
    return {
      clause: "t.deleted_at IS NULL",
      params: []
    };
  }

  const actorId = resolveUserId(user);
  if (!actorId) {
    return {
      clause: "1=0",
      params: []
    };
  }

  return {
    clause: `t.deleted_at IS NULL AND (t.created_by = $${firstParamIndex} OR t.assigned_to = $${firstParamIndex} OR $${firstParamIndex} = ANY(t.assignee_ids))`,
    params: [actorId]
  };
}

function buildNotificationKey(kind, identifier) {
  return `${String(kind || "event").trim()}:${String(identifier || "0").trim()}`;
}

function mapTaskNotification(row, type, severity, titleBuilder, messageBuilder) {
  const createdAt = toIso(row.createdAt || row.updatedAt || row.dueDate);
  return {
    key: buildNotificationKey(type, row.id),
    type,
    severity,
    title: titleBuilder(row),
    message: messageBuilder(row),
    route: `/tareas?focus=${row.id}`,
    createdAt,
    metadata: {
      taskId: Number(row.id),
      priority: row.priority || null,
      status: row.status || null,
      dueDate: row.dueDate || null
    }
  };
}

async function fetchOverdueTaskNotifications(user, limit) {
  const scope = buildTaskScopeWhere(user, 1);
  const params = [...scope.params];
  const limitIndex = params.push(limit);

  const result = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.priority,
        t.status,
        t.due_date AS "dueDate",
        t.updated_at AS "updatedAt",
        u.name AS "assignedToName"
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE ${scope.clause}
        AND t.due_date IS NOT NULL
        AND t.due_date < CURRENT_DATE
        AND t.status NOT IN ('completada', 'cancelada')
      ORDER BY t.due_date ASC, t.updated_at DESC
      LIMIT $${limitIndex}
    `,
    params
  );

  return result.rows.map((row) =>
    mapTaskNotification(
      row,
      "tareas_vencidas",
      "critical",
      () => `Tarea vencida: ${row.title || `#${row.id}`}`,
      () => `Vencio el ${row.dueDate || "-"}. Asignada a ${row.assignedToName || "sin asignar"}.`
    )
  );
}

async function fetchCriticalTaskNotifications(user, limit) {
  const scope = buildTaskScopeWhere(user, 1);
  const params = [...scope.params];
  const limitIndex = params.push(limit);

  const result = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.priority,
        t.status,
        t.due_date AS "dueDate",
        t.updated_at AS "updatedAt"
      FROM tasks t
      WHERE ${scope.clause}
        AND t.priority = 'alta'
        AND t.status NOT IN ('completada', 'cancelada')
      ORDER BY t.updated_at DESC
      LIMIT $${limitIndex}
    `,
    params
  );

  return result.rows.map((row) =>
    mapTaskNotification(
      row,
      "tareas_criticas",
      "high",
      () => `Tarea critica: ${row.title || `#${row.id}`}`,
      () => `Prioridad alta${row.dueDate ? ` | Vence ${row.dueDate}` : ""}.`
    )
  );
}

async function fetchAssignmentNotifications(user, limit) {
  const userId = resolveUserId(user);
  if (!userId) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.entity_id AS "taskId",
        a.created_at AS "createdAt",
        a.metadata,
        u.name AS "actorName"
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.action = 'task.assigned'
        AND (a.metadata ->> 'assignedTo')::bigint = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    key: buildNotificationKey("asignaciones", row.id),
    type: "asignaciones",
    severity: "medium",
    title: `Nueva asignacion en tarea #${row.taskId || "-"}`,
    message: `${row.actorName || "Sistema"} te asigno una tarea.`,
    route: row.taskId ? `/tareas?focus=${row.taskId}` : "/tareas",
    createdAt: toIso(row.createdAt),
    metadata: {
      auditId: Number(row.id),
      taskId: row.taskId ? Number(row.taskId) : null
    }
  }));
}

function canViewGlobalChanges(user) {
  const role = String(user?.role || "").toLowerCase();
  return role === "admin" || role === "supervisor";
}

async function fetchChangeNotifications(user, limit) {
  const privileged = canViewGlobalChanges(user);
  const userId = resolveUserId(user);
  const params = privileged ? [limit] : [userId || 0, limit];

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.action,
        a.entity,
        a.entity_id AS "entityId",
        a.created_at AS "createdAt",
        u.name AS "actorName"
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.action IN ('task.updated', 'events.updated', 'settings.updated', 'rbac.role_policy_updated')
        ${privileged ? "" : "AND a.user_id = $1"}
      ORDER BY a.created_at DESC
      LIMIT $${privileged ? 1 : 2}
    `,
    params
  );

  return result.rows.map((row) => {
    const entity = String(row.entity || "sistema").toLowerCase();
    let route = "/dashboard";
    if (entity === "task") {
      route = row.entityId ? `/tareas?focus=${row.entityId}` : "/tareas";
    } else if (entity === "event") {
      route = "/informes";
    } else if (entity === "system_settings") {
      route = "/configuracion";
    } else if (entity === "role_permission_policy") {
      route = "/usuarios/roles";
    }

    return {
      key: buildNotificationKey("cambios", row.id),
      type: "cambios",
      severity: "medium",
      title: `Cambio en ${entity}`,
      message: `${row.actorName || "Sistema"}: ${String(row.action || "actualizado").replace(/_/g, " ")}.`,
      route,
      createdAt: toIso(row.createdAt),
      metadata: {
        auditId: Number(row.id),
        action: row.action,
        entity,
        entityId: row.entityId ? Number(row.entityId) : null
      }
    };
  });
}

async function fetchSystemNotifications(user, limit) {
  const userId = resolveUserId(user);
  if (!userId) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.action,
        a.created_at AS "createdAt"
      FROM audit_logs a
      WHERE a.user_id = $1
        AND a.action IN ('auth.login_success', 'auth.logout', 'auth.password_recovered', 'auth.refresh_success')
      ORDER BY a.created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    key: buildNotificationKey("eventos_sistema", row.id),
    type: "eventos_sistema",
    severity: "low",
    title: "Evento de sesion",
    message: String(row.action || "auth.evento").replace(/_/g, " "),
    route: "/dashboard",
    createdAt: toIso(row.createdAt),
    metadata: {
      auditId: Number(row.id),
      action: row.action
    }
  }));
}

async function getReadNotificationKeys(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return new Set();
  }

  const result = await pool.query(
    `
      SELECT notification_key AS "notificationKey"
      FROM user_notification_reads
      WHERE user_id = $1
    `,
    [normalizedUserId]
  );

  return new Set(
    result.rows
      .map((row) => String(row.notificationKey || "").trim())
      .filter(Boolean)
  );
}

async function listNotificationsForUser(user, options = {}) {
  const userId = resolveUserId(user);
  if (!userId) {
    return [];
  }

  const limit = normalizeLimit(options.limit, 40);

  const [
    overdue,
    critical,
    assignments,
    changes,
    systemEvents,
    readKeys
  ] = await Promise.all([
    fetchOverdueTaskNotifications(user, Math.min(limit, 20)),
    fetchCriticalTaskNotifications(user, Math.min(limit, 20)),
    fetchAssignmentNotifications(user, Math.min(limit, 20)),
    fetchChangeNotifications(user, Math.min(limit, 20)),
    fetchSystemNotifications(user, Math.min(limit, 20)),
    getReadNotificationKeys(userId)
  ]);

  const merged = [...overdue, ...critical, ...assignments, ...changes, ...systemEvents]
    .filter((item) => item && item.key && item.createdAt)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit)
    .map((item) => ({
      ...item,
      read: readKeys.has(item.key)
    }));

  return merged;
}

function normalizeNotificationKey(input) {
  const value = String(input || "").trim();
  if (!value || value.length > 160) {
    return null;
  }
  if (!/^[a-z0-9:_-]+$/i.test(value)) {
    return null;
  }
  return value;
}

async function markNotificationAsRead(userId, notificationKey) {
  const normalizedUserId = Number(userId);
  const normalizedKey = normalizeNotificationKey(notificationKey);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0 || !normalizedKey) {
    return false;
  }

  await pool.query(
    `
      INSERT INTO user_notification_reads (user_id, notification_key, read_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, notification_key)
      DO UPDATE SET read_at = NOW()
    `,
    [normalizedUserId, normalizedKey]
  );

  return true;
}

async function markNotificationsAsRead(userId, notificationKeys = []) {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return 0;
  }

  const keys = Array.from(
    new Set(
      (Array.isArray(notificationKeys) ? notificationKeys : [])
        .map((item) => normalizeNotificationKey(item))
        .filter(Boolean)
    )
  );

  if (!keys.length) {
    return 0;
  }

  await pool.query(
    `
      INSERT INTO user_notification_reads (user_id, notification_key, read_at)
      SELECT $1, unnest($2::text[]), NOW()
      ON CONFLICT (user_id, notification_key)
      DO UPDATE SET read_at = NOW()
    `,
    [normalizedUserId, keys]
  );

  return keys.length;
}

module.exports = {
  listNotificationsForUser,
  normalizeNotificationKey,
  markNotificationAsRead,
  markNotificationsAsRead
};
