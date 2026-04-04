const { pool } = require("../db");
const {
  resolveActorId,
  canUserViewAnyTasks,
  canUserViewTask,
  canUserEditTask,
  canUserDeleteTask,
  canUserManageTaskSharedEdit,
  buildTaskPermissions
} = require("./authorization");

const TASK_STATUSES = Object.freeze([
  "sin_realizar",
  "en_proceso",
  "pendiente_revision",
  "completada",
  "cancelada"
]);

const TASK_PRIORITIES = Object.freeze(["baja", "media", "alta"]);

const TASK_SORT_COLUMNS = Object.freeze({
  createdAt: "t.created_at",
  updatedAt: "t.updated_at",
  dueDate: "t.due_date",
  startDate: "t.start_date",
  status: "t.status",
  priority: "t.priority",
  title: "t.title"
});

function toPositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function normalizeAssigneeIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((candidate) => Number(candidate))
    .filter((candidate) => Number.isInteger(candidate) && candidate > 0);
  return Array.from(new Set(normalized));
}

function parsePgBigIntArray(value) {
  if (Array.isArray(value)) {
    return normalizeAssigneeIds(value);
  }

  const raw = String(value || "").trim();
  if (!raw || raw === "{}") {
    return [];
  }

  const parsed = raw
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return normalizeAssigneeIds(parsed);
}

function buildTaskIdentityFromRow(row) {
  const createdById = toPositiveInteger(row.createdById ?? row.created_by ?? row.createdBy);
  const assignedToId = toPositiveInteger(row.assignedToId ?? row.assigned_to ?? row.assignedTo);
  const assigneeIdsRaw = row.assigneeIds ?? row.assignee_ids ?? [];
  const assigneeIds = parsePgBigIntArray(assigneeIdsRaw);
  if (assignedToId && !assigneeIds.includes(assignedToId)) {
    assigneeIds.unshift(assignedToId);
  }

  return {
    createdById,
    assignedToId,
    assignedUserIds: assigneeIds,
    allowAssigneesEdit: Boolean(row.allowAssigneesEdit ?? row.allow_assignees_edit ?? false)
  };
}

function normalizeSort(sortBy, sortOrder) {
  const safeSortBy = TASK_SORT_COLUMNS[sortBy] ? sortBy : "updatedAt";
  const safeSortOrder = String(sortOrder || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  return {
    sortColumn: TASK_SORT_COLUMNS[safeSortBy],
    sortOrder: safeSortOrder
  };
}

function buildTaskFilters(query, user) {
  const whereParts = ["t.deleted_at IS NULL"];
  const params = [];

  if (!canUserViewAnyTasks(user)) {
    const actorId = resolveActorId(user);
    if (!Number.isInteger(actorId) || actorId <= 0) {
      whereParts.push("1 = 0");
    } else {
      const creatorIndex = params.push(actorId);
      const assigneeArrayIndex = params.push(actorId);
      whereParts.push(
        `(t.created_by = $${creatorIndex} OR $${assigneeArrayIndex} = ANY(t.assignee_ids))`
      );
    }
  }

  if (query.status) {
    const statusIndex = params.push(query.status);
    whereParts.push(`t.status = $${statusIndex}`);
  }

  if (query.priority) {
    const priorityIndex = params.push(query.priority);
    whereParts.push(`t.priority = $${priorityIndex}`);
  }

  if (query.createdById) {
    const createdByIndex = params.push(query.createdById);
    whereParts.push(`t.created_by = $${createdByIndex}`);
  }

  if (query.assignedToId) {
    const assignedToIndex = params.push(query.assignedToId);
    whereParts.push(`$${assignedToIndex} = ANY(t.assignee_ids)`);
  }

  if (query.startFrom) {
    const startFromIndex = params.push(query.startFrom);
    whereParts.push(`t.start_date >= $${startFromIndex}`);
  }

  if (query.startTo) {
    const startToIndex = params.push(query.startTo);
    whereParts.push(`t.start_date <= $${startToIndex}`);
  }

  if (query.dueFrom) {
    const dueFromIndex = params.push(query.dueFrom);
    whereParts.push(`t.due_date >= $${dueFromIndex}`);
  }

  if (query.dueTo) {
    const dueToIndex = params.push(query.dueTo);
    whereParts.push(`t.due_date <= $${dueToIndex}`);
  }

  if (query.q) {
    const searchIndex = params.push(`%${String(query.q).toLowerCase()}%`);
    whereParts.push(`(LOWER(t.title) LIKE $${searchIndex} OR LOWER(t.description) LIKE $${searchIndex})`);
  }

  return {
    whereSql: whereParts.join(" AND "),
    params
  };
}

function mapTaskRow(row, user) {
  if (!row) {
    return null;
  }

  const taskIdentity = buildTaskIdentityFromRow(row);
  const createdById = taskIdentity.createdById;
  const assignedToId = taskIdentity.assignedToId;

  return {
    id: toPositiveInteger(row.id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    status: String(row.status || ""),
    priority: String(row.priority || ""),
    startDate: toDateOnly(row.startDate),
    dueDate: toDateOnly(row.dueDate),
    metadata: normalizeMetadata(row.metadata),
    allowAssigneesEdit: taskIdentity.allowAssigneesEdit,
    assignedUserIds: taskIdentity.assignedUserIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: {
      id: createdById,
      name: String(row.createdByName || ""),
      email: String(row.createdByEmail || "")
    },
    assignedTo: assignedToId
      ? {
          id: assignedToId,
          name: String(row.assignedToName || ""),
          email: String(row.assignedToEmail || "")
        }
      : null,
    permissions: buildTaskPermissions(user, taskIdentity)
  };
}

function taskRowSelectSql() {
  return `
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.start_date AS "startDate",
      t.due_date AS "dueDate",
      t.assignee_ids AS "assigneeIds",
      t.allow_assignees_edit AS "allowAssigneesEdit",
      t.metadata,
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      creator.id AS "createdById",
      creator.name AS "createdByName",
      creator.email AS "createdByEmail",
      assignee.id AS "assignedToId",
      assignee.name AS "assignedToName",
      assignee.email AS "assignedToEmail"
    FROM tasks t
    JOIN users creator ON creator.id = t.created_by
    LEFT JOIN users assignee ON assignee.id = t.assigned_to
  `;
}

async function getUserLiteById(userId) {
  const normalizedUserId = toPositiveInteger(userId);
  if (!normalizedUserId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT id, name, email
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [normalizedUserId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function getUsersLiteByIds(userIds) {
  const normalizedIds = normalizeAssigneeIds(userIds);
  if (!normalizedIds.length) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT id, name, email
      FROM users
      WHERE id = ANY($1::bigint[])
    `,
    [normalizedIds]
  );

  return result.rows;
}

async function getTaskById(taskId) {
  const normalizedTaskId = toPositiveInteger(taskId);
  if (!normalizedTaskId) {
    return null;
  }

  const result = await pool.query(
    `
      ${taskRowSelectSql()}
      WHERE t.id = $1
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [normalizedTaskId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

function ensureTaskDateRange(query) {
  if (query.startFrom && query.startTo && String(query.startFrom) > String(query.startTo)) {
    return false;
  }

  if (query.dueFrom && query.dueTo && String(query.dueFrom) > String(query.dueTo)) {
    return false;
  }

  return true;
}

async function listTasks({ user, query }) {
  const { whereSql, params } = buildTaskFilters(query, user);
  const { sortColumn, sortOrder } = normalizeSort(query.sortBy, query.sortOrder);

  const totalResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM tasks t
      WHERE ${whereSql}
    `,
    params
  );

  const totalItems = Number(totalResult.rows[0]?.total || 0);
  const pageSize = Number(query.pageSize || 20);
  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
  const page = Math.min(Number(query.page || 1), totalPages);
  const offset = (page - 1) * pageSize;

  const listParams = [...params];
  const limitIndex = listParams.push(pageSize);
  const offsetIndex = listParams.push(offset);

  const listResult = await pool.query(
    `
      ${taskRowSelectSql()}
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortOrder}, t.id DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `,
    listParams
  );

  const items = listResult.rows.map((row) => mapTaskRow(row, user));

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };
}

async function listTasksForExport({ user, query, limit = 5000 }) {
  const { whereSql, params } = buildTaskFilters(query, user);
  const { sortColumn, sortOrder } = normalizeSort(query.sortBy, query.sortOrder);
  const cappedLimit = Math.max(1, Math.min(Number(limit || 5000), 10000));
  const listParams = [...params];
  const limitIndex = listParams.push(cappedLimit);

  const listResult = await pool.query(
    `
      ${taskRowSelectSql()}
      WHERE ${whereSql}
      ORDER BY ${sortColumn} ${sortOrder}, t.id DESC
      LIMIT $${limitIndex}
    `,
    listParams
  );

  return listResult.rows.map((row) => mapTaskRow(row, user));
}

async function getTaskByIdForUser(taskId, user) {
  const row = await getTaskById(taskId);
  if (!row) {
    return null;
  }

  if (!canUserViewTask(user, row)) {
    return null;
  }

  return mapTaskRow(row, user);
}

async function createTask({ user, payload }) {
  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new Error("invalid_actor");
  }

  const metadata = normalizeMetadata(payload.metadata);
  const assigneeIds = normalizeAssigneeIds(payload.assigneeIds);
  const primaryAssignedTo = assigneeIds[0] || null;
  const allowAssigneesEdit = Boolean(payload.allowAssigneesEdit);
  const insertResult = await pool.query(
    `
      INSERT INTO tasks (
        title,
        description,
        status,
        priority,
        start_date,
        due_date,
        created_by,
        assigned_to,
        assignee_ids,
        allow_assignees_edit,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::bigint[], $10, $11::jsonb)
      RETURNING id
    `,
    [
      payload.title,
      payload.description,
      payload.status,
      payload.priority,
      payload.startDate || null,
      payload.dueDate || null,
      actorId,
      primaryAssignedTo,
      assigneeIds,
      allowAssigneesEdit,
      JSON.stringify(metadata)
    ]
  );

  const createdTask = await getTaskById(insertResult.rows[0].id);
  return mapTaskRow(createdTask, user);
}

async function patchTask({ taskId, user, payload }) {
  const beforeRow = await getTaskById(taskId);
  if (!beforeRow) {
    return {
      error: "not_found"
    };
  }

  if (!canUserEditTask(user, beforeRow)) {
    return {
      error: "forbidden"
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, "allowAssigneesEdit") &&
    !canUserManageTaskSharedEdit(user, beforeRow)
  ) {
    return {
      error: "shared_edit_forbidden"
    };
  }

  const fields = [];
  const values = [taskId];
  const beforeIdentity = buildTaskIdentityFromRow(beforeRow);
  let nextAssigneeIds = beforeIdentity.assignedUserIds.slice();
  let nextAllowAssigneesEdit = beforeIdentity.allowAssigneesEdit;

  if (payload.title !== undefined) {
    values.push(payload.title);
    fields.push(`title = $${values.length}`);
  }
  if (payload.description !== undefined) {
    values.push(payload.description);
    fields.push(`description = $${values.length}`);
  }
  if (payload.status !== undefined) {
    values.push(payload.status);
    fields.push(`status = $${values.length}`);
  }
  if (payload.priority !== undefined) {
    values.push(payload.priority);
    fields.push(`priority = $${values.length}`);
  }
  if (payload.startDate !== undefined) {
    values.push(payload.startDate || null);
    fields.push(`start_date = $${values.length}`);
  }
  if (payload.dueDate !== undefined) {
    values.push(payload.dueDate || null);
    fields.push(`due_date = $${values.length}`);
  }
  if (payload.assignedTo !== undefined) {
    nextAssigneeIds = normalizeAssigneeIds(payload.assigneeIds || []);
    const fallbackAssignedTo = payload.assignedTo || null;
    if (
      Number.isInteger(Number(fallbackAssignedTo)) &&
      Number(fallbackAssignedTo) > 0 &&
      !nextAssigneeIds.includes(Number(fallbackAssignedTo))
    ) {
      nextAssigneeIds.unshift(Number(fallbackAssignedTo));
    }

    values.push(nextAssigneeIds[0] || null);
    fields.push(`assigned_to = $${values.length}`);
    values.push(nextAssigneeIds);
    fields.push(`assignee_ids = $${values.length}::bigint[]`);
  } else if (payload.assigneeIds !== undefined) {
    nextAssigneeIds = normalizeAssigneeIds(payload.assigneeIds || []);
    values.push(nextAssigneeIds[0] || null);
    fields.push(`assigned_to = $${values.length}`);
    values.push(nextAssigneeIds);
    fields.push(`assignee_ids = $${values.length}::bigint[]`);
  }
  if (payload.allowAssigneesEdit !== undefined) {
    nextAllowAssigneesEdit = Boolean(payload.allowAssigneesEdit);
    values.push(nextAllowAssigneesEdit);
    fields.push(`allow_assignees_edit = $${values.length}`);
  }
  if (payload.metadata !== undefined) {
    values.push(JSON.stringify(normalizeMetadata(payload.metadata)));
    fields.push(`metadata = $${values.length}::jsonb`);
  }

  if (fields.length === 0) {
    return {
      error: "no_changes"
    };
  }

  if (nextAllowAssigneesEdit && nextAssigneeIds.length === 0) {
    return {
      error: "invalid_shared_edit_state"
    };
  }

  await pool.query(
    `
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    values
  );

  const afterRow = await getTaskById(taskId);
  if (!afterRow) {
    return {
      error: "not_found"
    };
  }

  return {
    before: mapTaskRow(beforeRow, user),
    after: mapTaskRow(afterRow, user),
    statusChanged: beforeRow.status !== afterRow.status,
    assignedChanged: (() => {
      const afterIdentity = buildTaskIdentityFromRow(afterRow);
      if (beforeIdentity.assignedUserIds.length !== afterIdentity.assignedUserIds.length) {
        return true;
      }
      return beforeIdentity.assignedUserIds.some(
        (value, index) => value !== afterIdentity.assignedUserIds[index]
      );
    })(),
    sharedEditChanged:
      Boolean(beforeRow.allowAssigneesEdit ?? beforeRow.allow_assignees_edit ?? false) !==
      Boolean(afterRow.allowAssigneesEdit ?? afterRow.allow_assignees_edit ?? false)
  };
}

async function patchTaskStatus({ taskId, user, status }) {
  const beforeRow = await getTaskById(taskId);
  if (!beforeRow) {
    return {
      error: "not_found"
    };
  }

  if (!canUserEditTask(user, beforeRow)) {
    return {
      error: "forbidden"
    };
  }

  await pool.query(
    `
      UPDATE tasks
      SET status = $2
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [taskId, status]
  );

  const afterRow = await getTaskById(taskId);
  if (!afterRow) {
    return {
      error: "not_found"
    };
  }

  return {
    before: mapTaskRow(beforeRow, user),
    after: mapTaskRow(afterRow, user)
  };
}

async function softDeleteTask({ taskId, user }) {
  const beforeRow = await getTaskById(taskId);
  if (!beforeRow) {
    return {
      error: "not_found"
    };
  }

  if (!canUserDeleteTask(user, beforeRow)) {
    return {
      error: "forbidden"
    };
  }

  await pool.query(
    `
      UPDATE tasks
      SET deleted_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [taskId]
  );

  return {
    before: mapTaskRow(beforeRow, user)
  };
}

async function getTaskStats({ user, query }) {
  const { whereSql, params } = buildTaskFilters(query, user);

  const [totalsResult, statusResult, priorityResult] = await Promise.all([
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM tasks t
        WHERE ${whereSql}
      `,
      params
    ),
    pool.query(
      `
        SELECT status, COUNT(*)::int AS total
        FROM tasks t
        WHERE ${whereSql}
        GROUP BY status
      `,
      params
    ),
    pool.query(
      `
        SELECT priority, COUNT(*)::int AS total
        FROM tasks t
        WHERE ${whereSql}
        GROUP BY priority
      `,
      params
    )
  ]);

  const byStatus = TASK_STATUSES.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  statusResult.rows.forEach((row) => {
    const key = String(row.status || "");
    if (Object.hasOwn(byStatus, key)) {
      byStatus[key] = Number(row.total || 0);
    }
  });

  const byPriority = TASK_PRIORITIES.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  priorityResult.rows.forEach((row) => {
    const key = String(row.priority || "");
    if (Object.hasOwn(byPriority, key)) {
      byPriority[key] = Number(row.total || 0);
    }
  });

  return {
    total: Number(totalsResult.rows[0]?.total || 0),
    byStatus,
    byPriority
  };
}

function toDashboardTaskItem(task) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    allowAssigneesEdit: Boolean(task.allowAssigneesEdit),
    assignedUserIds: Array.isArray(task.assignedUserIds) ? task.assignedUserIds : [],
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    createdBy: task.createdBy ? { id: task.createdBy.id, name: task.createdBy.name } : null,
    assignedTo: task.assignedTo ? { id: task.assignedTo.id, name: task.assignedTo.name } : null,
    permissions: task.permissions
  };
}

async function getTaskDashboardSummary({ user, dueSoonDays = 7, recentLimit = 5 }) {
  const safeDueSoonDays = Math.max(1, Math.min(Number(dueSoonDays || 7), 30));
  const safeRecentLimit = Math.max(1, Math.min(Number(recentLimit || 5), 12));
  const actorId = resolveActorId(user);
  const scopedActorId = Number.isInteger(actorId) && actorId > 0 ? actorId : -1;

  const { whereSql, params } = buildTaskFilters({}, user);
  const summaryParams = [...params];
  const dueSoonIndex = summaryParams.push(safeDueSoonDays);
  const actorIndex = summaryParams.push(scopedActorId);

  const summaryResult = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status = 'sin_realizar')::int AS sin_realizar,
        COUNT(*) FILTER (WHERE t.status = 'en_proceso')::int AS en_proceso,
        COUNT(*) FILTER (WHERE t.status = 'pendiente_revision')::int AS pendiente_revision,
        COUNT(*) FILTER (WHERE t.status = 'completada')::int AS completada,
        COUNT(*) FILTER (WHERE t.status = 'cancelada')::int AS cancelada,
        COUNT(*) FILTER (
          WHERE t.due_date IS NOT NULL
            AND t.due_date < CURRENT_DATE
            AND t.status NOT IN ('completada', 'cancelada')
        )::int AS vencidas,
        COUNT(*) FILTER (
          WHERE t.due_date IS NOT NULL
            AND t.due_date >= CURRENT_DATE
            AND t.due_date <= CURRENT_DATE + $${dueSoonIndex}::int
            AND t.status NOT IN ('completada', 'cancelada')
        )::int AS proximas_vencer,
        COUNT(*) FILTER (WHERE $${actorIndex} = ANY(t.assignee_ids))::int AS asignadas_a_mi,
        COUNT(*) FILTER (WHERE t.created_by = $${actorIndex})::int AS creadas_por_mi
      FROM tasks t
      WHERE ${whereSql}
    `,
    summaryParams
  );

  const recentParams = [...params];
  const limitIndex = recentParams.push(safeRecentLimit);
  const recentResult = await pool.query(
    `
      ${taskRowSelectSql()}
      WHERE ${whereSql}
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT $${limitIndex}
    `,
    recentParams
  );

  const summaryRow = summaryResult.rows[0] || {};
  const recentTasks = recentResult.rows
    .map((row) => mapTaskRow(row, user))
    .map((task) => toDashboardTaskItem(task))
    .filter(Boolean);

  return {
    range: {
      dueSoonDays: safeDueSoonDays
    },
    totals: {
      total: Number(summaryRow.total || 0),
      sinRealizar: Number(summaryRow.sin_realizar || 0),
      enProceso: Number(summaryRow.en_proceso || 0),
      pendienteRevision: Number(summaryRow.pendiente_revision || 0),
      completada: Number(summaryRow.completada || 0),
      cancelada: Number(summaryRow.cancelada || 0),
      vencidas: Number(summaryRow.vencidas || 0),
      proximasVencer: Number(summaryRow.proximas_vencer || 0),
      asignadasAMi: Number(summaryRow.asignadas_a_mi || 0),
      creadasPorMi: Number(summaryRow.creadas_por_mi || 0)
    },
    recent: recentTasks
  };
}

module.exports = {
  TASK_STATUSES,
  TASK_PRIORITIES,
  ensureTaskDateRange,
  getUserLiteById,
  getUsersLiteByIds,
  listTasks,
  listTasksForExport,
  getTaskByIdForUser,
  createTask,
  patchTask,
  patchTaskStatus,
  softDeleteTask,
  getTaskStats,
  getTaskDashboardSummary
};
