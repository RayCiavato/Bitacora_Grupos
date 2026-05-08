const { pool } = require("../db");

const GROUP_ACTIONS = Object.freeze(["view", "create", "edit", "delete", "export", "administer"]);
const DEFAULT_GROUP_SLUG = "general";
const DEFAULT_RESOURCE_TYPE = "all";
const RESOURCE_TYPES = Object.freeze([
  "all",
  "events",
  "tasks",
  "attachments",
  "reports",
  "dashboard",
  "audit",
  "telegram",
  "realtime"
]);

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeGroupSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeResourceType(value) {
  const normalized = String(value || DEFAULT_RESOURCE_TYPE)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return RESOURCE_TYPES.includes(normalized) ? normalized : DEFAULT_RESOURCE_TYPE;
}

function normalizeGroupAction(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return GROUP_ACTIONS.includes(normalized) ? normalized : null;
}

function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function getGroupIdFromResource(resource) {
  return toPositiveInteger(
    resource?.groupId ??
      resource?.group_id ??
      resource?.targetGroupId ??
      resource?.target_group_id ??
      resource?.eventGroupId ??
      resource?.taskGroupId
  );
}

function mapGroupRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    isSystem: Boolean(row.isSystem ?? row.is_system),
    isActive: Boolean(row.isActive ?? row.is_active),
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at
  };
}

function mapPolicyRow(row) {
  return {
    id: Number(row.id),
    sourceGroupId: Number(row.sourceGroupId ?? row.source_group_id),
    targetGroupId: Number(row.targetGroupId ?? row.target_group_id),
    resourceType: row.resourceType ?? row.resource_type ?? DEFAULT_RESOURCE_TYPE,
    canView: Boolean(row.canView ?? row.can_view),
    canCreate: Boolean(row.canCreate ?? row.can_create),
    canEdit: Boolean(row.canEdit ?? row.can_edit),
    canDelete: Boolean(row.canDelete ?? row.can_delete),
    canExport: Boolean(row.canExport ?? row.can_export),
    canAdminister: Boolean(row.canAdminister ?? row.can_administer),
    updatedAt: row.updatedAt ?? row.updated_at
  };
}

function toAccessKey(action) {
  const normalized = normalizeGroupAction(action);
  if (!normalized) {
    return null;
  }
  return `${normalized}GroupIds`;
}

function hasGroupAccess(user, action, targetGroupId) {
  const key = toAccessKey(action);
  const safeTargetGroupId = toPositiveInteger(targetGroupId);
  if (!key || !safeTargetGroupId) {
    return false;
  }
  if (isAdminUser(user)) {
    return true;
  }
  const ids = Array.isArray(user?.groupAccess?.[key]) ? user.groupAccess[key] : [];
  return ids.map(Number).includes(safeTargetGroupId);
}

function getGroupAccessIds(user, action) {
  const key = toAccessKey(action);
  if (!key) {
    return [];
  }
  const ids = Array.isArray(user?.groupAccess?.[key]) ? user.groupAccess[key] : [];
  return Array.from(new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
}

function groupRowsByIds(groups, ids) {
  const idSet = new Set(
    (Array.isArray(ids) ? ids : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  return (Array.isArray(groups) ? groups : []).filter((group) => idSet.has(Number(group.id)));
}

function canUserViewGroupResource(user, resource) {
  const groupId = getGroupIdFromResource(resource);
  return Boolean(groupId && hasGroupAccess(user, "view", groupId));
}

function canUserCreateInGroup(user, groupId) {
  return hasGroupAccess(user, "create", groupId);
}

function canUserEditGroupResource(user, resource) {
  const groupId = getGroupIdFromResource(resource);
  return Boolean(groupId && hasGroupAccess(user, "edit", groupId));
}

function canUserDeleteGroupResource(user, resource) {
  const groupId = getGroupIdFromResource(resource);
  return Boolean(groupId && hasGroupAccess(user, "delete", groupId));
}

function canUserExportGroup(user, groupId) {
  return hasGroupAccess(user, "export", groupId);
}

function canUserAdministerGroup(user, groupId) {
  return hasGroupAccess(user, "administer", groupId);
}

function getVisibleGroupIdsForUser(user) {
  return getGroupAccessIds(user, "view");
}

function getEditableGroupIdsForUser(user) {
  return getGroupAccessIds(user, "edit");
}

function getExportableGroupIdsForUser(user) {
  return getGroupAccessIds(user, "export");
}

function buildGroupScopeCondition({ alias = "e", column = "group_id", user, params, action = "view" }) {
  const groupIds = getGroupAccessIds(user, action);
  if (!groupIds.length) {
    return "FALSE";
  }
  const index = params.push(groupIds);
  return `${alias}.${column} = ANY($${index}::bigint[])`;
}

async function listGroups({ includeInactive = false } = {}) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        slug,
        description,
        is_system AS "isSystem",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM groups
      ${includeInactive ? "" : "WHERE is_active = TRUE"}
      ORDER BY is_system DESC, name ASC
    `
  );
  return result.rows.map(mapGroupRow);
}

async function listVisibleGroupOperationalSummaries(user) {
  const visibleGroupIds = getVisibleGroupIdsForUser(user);
  if (!visibleGroupIds.length) {
    return [];
  }

  const result = await pool.query(
    `
      WITH event_counts AS (
        SELECT
          e.group_id,
          COUNT(*)::int AS total_events,
          MAX(GREATEST(e.created_at, e.updated_at)) AS last_event_at
        FROM events e
        WHERE e.group_id = ANY($1::bigint[])
        GROUP BY e.group_id
      ),
      task_counts AS (
        SELECT
          t.group_id,
          COUNT(*)::int AS total_tasks,
          COUNT(*) FILTER (
            WHERE t.deleted_at IS NULL
              AND t.due_date < CURRENT_DATE
              AND t.status NOT IN ('completada', 'cancelada')
          )::int AS overdue_tasks,
          COUNT(*) FILTER (
            WHERE t.deleted_at IS NULL
              AND t.priority = 'alta'
              AND t.status NOT IN ('completada', 'cancelada')
          )::int AS high_priority_tasks,
          COUNT(*) FILTER (
            WHERE t.deleted_at IS NULL
              AND t.status = 'en_proceso'
          )::int AS in_progress_tasks,
          COUNT(*) FILTER (
            WHERE t.deleted_at IS NULL
              AND t.status = 'sin_realizar'
          )::int AS pending_tasks,
          MAX(t.updated_at) FILTER (WHERE t.deleted_at IS NULL) AS last_task_at
        FROM tasks t
        WHERE t.group_id = ANY($1::bigint[])
        GROUP BY t.group_id
      )
      SELECT
        g.id,
        g.name,
        g.slug,
        g.description,
        COALESCE(ec.total_events, 0)::int AS "totalEvents",
        COALESCE(tc.total_tasks, 0)::int AS "totalTasks",
        COALESCE(tc.overdue_tasks, 0)::int AS "overdueTasks",
        COALESCE(tc.high_priority_tasks, 0)::int AS "highPriorityTasks",
        COALESCE(tc.in_progress_tasks, 0)::int AS "inProgressTasks",
        COALESCE(tc.pending_tasks, 0)::int AS "pendingTasks",
        GREATEST(ec.last_event_at, tc.last_task_at) AS "lastActivityAt"
      FROM groups g
      LEFT JOIN event_counts ec ON ec.group_id = g.id
      LEFT JOIN task_counts tc ON tc.group_id = g.id
      WHERE g.id = ANY($1::bigint[])
        AND g.is_active = TRUE
      ORDER BY g.is_system DESC, g.name ASC
    `,
    [visibleGroupIds]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    totalEvents: Number(row.totalEvents || 0),
    totalTasks: Number(row.totalTasks || 0),
    overdueTasks: Number(row.overdueTasks || 0),
    highPriorityTasks: Number(row.highPriorityTasks || 0),
    inProgressTasks: Number(row.inProgressTasks || 0),
    pendingTasks: Number(row.pendingTasks || 0),
    lastActivityAt: row.lastActivityAt || null
  }));
}

async function getDefaultGroup() {
  const result = await pool.query(
    `
      SELECT id, name, slug, description, is_system, is_active, created_at, updated_at
      FROM groups
      WHERE slug = $1
      LIMIT 1
    `,
    [DEFAULT_GROUP_SLUG]
  );
  return result.rows[0] ? mapGroupRow(result.rows[0]) : null;
}

async function getGroupById(groupId) {
  const safeGroupId = toPositiveInteger(groupId);
  if (!safeGroupId) {
    return null;
  }
  const result = await pool.query(
    `
      SELECT id, name, slug, description, is_system, is_active, created_at, updated_at
      FROM groups
      WHERE id = $1
      LIMIT 1
    `,
    [safeGroupId]
  );
  return result.rows[0] ? mapGroupRow(result.rows[0]) : null;
}

async function resolvePrimaryGroupIdForUser(user) {
  const membershipIds = Array.isArray(user?.groupAccess?.memberGroupIds)
    ? user.groupAccess.memberGroupIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (membershipIds.length) {
    return membershipIds[0];
  }
  const defaultGroup = await getDefaultGroup();
  return defaultGroup?.id || null;
}

async function resolveTargetGroupIdForCreate(user, requestedGroupId) {
  const explicitGroupId = toPositiveInteger(requestedGroupId);
  if (explicitGroupId) {
    if (!canUserCreateInGroup(user, explicitGroupId)) {
      return { error: "forbidden", groupId: null };
    }
    return { error: null, groupId: explicitGroupId };
  }

  const groupId = await resolvePrimaryGroupIdForUser(user);
  if (!groupId) {
    return { error: "group_not_found", groupId: null };
  }
  if (!canUserCreateInGroup(user, groupId)) {
    return { error: "forbidden", groupId: null };
  }
  return { error: null, groupId };
}

async function createGroup({ name, description = "", actorId = null } = {}) {
  const safeName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const slug = normalizeGroupSlug(safeName);
  if (!safeName || !slug) {
    return { error: "validation_error", group: null };
  }

  const duplicateResult = await pool.query(
    "SELECT id FROM groups WHERE lower(name) = lower($1) OR slug = $2 LIMIT 1",
    [safeName, slug]
  );
  if (duplicateResult.rowCount > 0) {
    return { error: "group_already_exists", group: null };
  }

  const result = await pool.query(
    `
      INSERT INTO groups (name, slug, description, is_system)
      VALUES ($1, $2, $3, FALSE)
      RETURNING id, name, slug, description, is_system, is_active, created_at, updated_at
    `,
    [safeName, slug, String(description || "").trim().slice(0, 500)]
  );

  const group = mapGroupRow(result.rows[0]);
  await seedSelfPolicy(group.id);
  return { error: null, group, actorId };
}

async function updateGroup(groupId, payload = {}) {
  const safeGroupId = toPositiveInteger(groupId);
  if (!safeGroupId) {
    return { error: "group_not_found", group: null };
  }

  const fields = [];
  const values = [safeGroupId];
  if (payload.name !== undefined) {
    const safeName = String(payload.name || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (!safeName) {
      return { error: "validation_error", group: null };
    }
    const duplicateResult = await pool.query(
      "SELECT id FROM groups WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1",
      [safeName, safeGroupId]
    );
    if (duplicateResult.rowCount > 0) {
      return { error: "group_already_exists", group: null };
    }
    values.push(safeName);
    fields.push(`name = $${values.length}`);
  }
  if (payload.description !== undefined) {
    values.push(String(payload.description || "").trim().slice(0, 500));
    fields.push(`description = $${values.length}`);
  }
  if (payload.isActive !== undefined) {
    values.push(Boolean(payload.isActive));
    fields.push(`is_active = $${values.length}`);
  }

  if (!fields.length) {
    return { error: "validation_error", group: null };
  }

  const result = await pool.query(
    `
      UPDATE groups
      SET ${fields.join(", ")}
      WHERE id = $1
      RETURNING id, name, slug, description, is_system, is_active, created_at, updated_at
    `,
    values
  );

  if (result.rowCount === 0) {
    return { error: "group_not_found", group: null };
  }

  return { error: null, group: mapGroupRow(result.rows[0]) };
}

async function seedSelfPolicy(groupId) {
  const safeGroupId = toPositiveInteger(groupId);
  if (!safeGroupId) {
    return;
  }
  await pool.query(
    `
      INSERT INTO group_access_policies (
        source_group_id,
        target_group_id,
        resource_type,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_export,
        can_administer
      )
      VALUES ($1, $1, $2, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE)
      ON CONFLICT (source_group_id, target_group_id, resource_type) DO NOTHING
    `,
    [safeGroupId, DEFAULT_RESOURCE_TYPE]
  );
}

async function listGroupPolicies({ resourceType = DEFAULT_RESOURCE_TYPE } = {}) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.source_group_id AS "sourceGroupId",
        p.target_group_id AS "targetGroupId",
        p.resource_type AS "resourceType",
        p.can_view AS "canView",
        p.can_create AS "canCreate",
        p.can_edit AS "canEdit",
        p.can_delete AS "canDelete",
        p.can_export AS "canExport",
        p.can_administer AS "canAdminister",
        p.updated_at AS "updatedAt"
      FROM group_access_policies p
      WHERE p.resource_type = $1
      ORDER BY p.source_group_id ASC, p.target_group_id ASC
    `,
    [normalizedResourceType]
  );
  return result.rows.map(mapPolicyRow);
}

async function getGroupPolicy({
  sourceGroupId,
  targetGroupId,
  resourceType = DEFAULT_RESOURCE_TYPE
} = {}) {
  const sourceId = toPositiveInteger(sourceGroupId);
  const targetId = toPositiveInteger(targetGroupId);
  if (!sourceId || !targetId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        id,
        source_group_id AS "sourceGroupId",
        target_group_id AS "targetGroupId",
        resource_type AS "resourceType",
        can_view AS "canView",
        can_create AS "canCreate",
        can_edit AS "canEdit",
        can_delete AS "canDelete",
        can_export AS "canExport",
        can_administer AS "canAdminister",
        updated_at AS "updatedAt"
      FROM group_access_policies
      WHERE source_group_id = $1
        AND target_group_id = $2
        AND resource_type = $3
      LIMIT 1
    `,
    [sourceId, targetId, normalizeResourceType(resourceType)]
  );

  return result.rows[0] ? mapPolicyRow(result.rows[0]) : null;
}

async function upsertGroupPolicy({
  sourceGroupId,
  targetGroupId,
  resourceType = DEFAULT_RESOURCE_TYPE,
  permissions = {}
} = {}) {
  const sourceId = toPositiveInteger(sourceGroupId);
  const targetId = toPositiveInteger(targetGroupId);
  if (!sourceId || !targetId) {
    return { error: "group_not_found", policy: null };
  }

  const result = await pool.query(
    `
      INSERT INTO group_access_policies (
        source_group_id,
        target_group_id,
        resource_type,
        can_view,
        can_create,
        can_edit,
        can_delete,
        can_export,
        can_administer
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source_group_id, target_group_id, resource_type)
      DO UPDATE SET
        can_view = EXCLUDED.can_view,
        can_create = EXCLUDED.can_create,
        can_edit = EXCLUDED.can_edit,
        can_delete = EXCLUDED.can_delete,
        can_export = EXCLUDED.can_export,
        can_administer = EXCLUDED.can_administer
      RETURNING
        id,
        source_group_id AS "sourceGroupId",
        target_group_id AS "targetGroupId",
        resource_type AS "resourceType",
        can_view AS "canView",
        can_create AS "canCreate",
        can_edit AS "canEdit",
        can_delete AS "canDelete",
        can_export AS "canExport",
        can_administer AS "canAdminister",
        updated_at AS "updatedAt"
    `,
    [
      sourceId,
      targetId,
      normalizeResourceType(resourceType),
      Boolean(permissions.canView),
      Boolean(permissions.canCreate),
      Boolean(permissions.canEdit),
      Boolean(permissions.canDelete),
      Boolean(permissions.canExport),
      Boolean(permissions.canAdminister)
    ]
  );

  return { error: null, policy: mapPolicyRow(result.rows[0]) };
}

async function listGroupMembers(groupId) {
  const safeGroupId = toPositiveInteger(groupId);
  if (!safeGroupId) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT
        ug.id,
        ug.group_id AS "groupId",
        ug.user_id AS "userId",
        ug.role_in_group AS "roleInGroup",
        u.name,
        u.email,
        u.role,
        u.is_active AS "isActive",
        ug.created_at AS "createdAt",
        ug.updated_at AS "updatedAt"
      FROM user_groups ug
      JOIN users u ON u.id = ug.user_id
      WHERE ug.group_id = $1
      ORDER BY u.name ASC, u.email ASC
    `,
    [safeGroupId]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    groupId: Number(row.groupId),
    userId: Number(row.userId),
    roleInGroup: row.roleInGroup || "miembro",
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

async function getUserGroupMembership({ groupId, userId } = {}) {
  const safeGroupId = toPositiveInteger(groupId);
  const safeUserId = toPositiveInteger(userId);
  if (!safeGroupId || !safeUserId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        ug.id,
        ug.group_id AS "groupId",
        ug.user_id AS "userId",
        ug.role_in_group AS "roleInGroup",
        ug.created_at AS "createdAt",
        ug.updated_at AS "updatedAt"
      FROM user_groups ug
      WHERE ug.group_id = $1
        AND ug.user_id = $2
      LIMIT 1
    `,
    [safeGroupId, safeUserId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: Number(row.id),
    groupId: Number(row.groupId),
    userId: Number(row.userId),
    roleInGroup: row.roleInGroup || "miembro",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function addUserToGroup({ groupId, userId, roleInGroup = "miembro" } = {}) {
  const safeGroupId = toPositiveInteger(groupId);
  const safeUserId = toPositiveInteger(userId);
  if (!safeGroupId || !safeUserId) {
    return { error: "validation_error" };
  }

  await pool.query(
    `
      INSERT INTO user_groups (user_id, group_id, role_in_group)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id)
      DO UPDATE SET role_in_group = EXCLUDED.role_in_group
    `,
    [safeUserId, safeGroupId, String(roleInGroup || "miembro").trim().slice(0, 80)]
  );
  return { error: null };
}

async function removeUserFromGroup({ groupId, userId } = {}) {
  const safeGroupId = toPositiveInteger(groupId);
  const safeUserId = toPositiveInteger(userId);
  if (!safeGroupId || !safeUserId) {
    return { error: "validation_error" };
  }
  await pool.query("DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2", [
    safeUserId,
    safeGroupId
  ]);
  return { error: null };
}

async function getUserGroupAccess(user) {
  const userId = toPositiveInteger(user?.sub ?? user?.id);
  if (!userId) {
    return {
      memberships: [],
      memberGroupIds: [],
      viewGroupIds: [],
      createGroupIds: [],
      editGroupIds: [],
      deleteGroupIds: [],
      exportGroupIds: [],
      administerGroupIds: []
    };
  }

  const [groupsResult, membershipsResult, policiesResult] = await Promise.all([
    pool.query(
      `
        SELECT id, name, slug, description, is_system, is_active, created_at, updated_at
        FROM groups
        WHERE is_active = TRUE
        ORDER BY is_system DESC, name ASC
      `
    ),
    pool.query(
      `
        SELECT
          g.id,
          g.name,
          g.slug,
          g.description,
          g.is_system,
          g.is_active,
          ug.role_in_group,
          ug.created_at,
          ug.updated_at
        FROM user_groups ug
        JOIN groups g ON g.id = ug.group_id
        WHERE ug.user_id = $1
          AND g.is_active = TRUE
        ORDER BY g.is_system DESC, g.name ASC
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT
          p.source_group_id,
          p.target_group_id,
          p.resource_type,
          p.can_view,
          p.can_create,
          p.can_edit,
          p.can_delete,
          p.can_export,
          p.can_administer
        FROM group_access_policies p
        JOIN groups source ON source.id = p.source_group_id AND source.is_active = TRUE
        JOIN groups target ON target.id = p.target_group_id AND target.is_active = TRUE
        WHERE p.resource_type = $1
      `,
      [DEFAULT_RESOURCE_TYPE]
    )
  ]);

  const allActiveGroups = groupsResult.rows.map(mapGroupRow);
  const memberships = membershipsResult.rows.map((row) => ({
    ...mapGroupRow(row),
    roleInGroup: row.role_in_group || "miembro"
  }));

  if (isAdminUser(user)) {
    const allIds = allActiveGroups.map((group) => group.id);
    return {
      memberships,
      memberGroupIds: memberships.map((group) => group.id),
      visibleGroups: allActiveGroups,
      creatableGroups: allActiveGroups,
      editableGroups: allActiveGroups,
      exportableGroups: allActiveGroups,
      viewGroupIds: allIds,
      createGroupIds: allIds,
      editGroupIds: allIds,
      deleteGroupIds: allIds,
      exportGroupIds: allIds,
      administerGroupIds: allIds
    };
  }

  const sourceIds = new Set(memberships.map((group) => Number(group.id)));
  const access = {
    memberships,
    memberGroupIds: Array.from(sourceIds),
    viewGroupIds: [],
    createGroupIds: [],
    editGroupIds: [],
    deleteGroupIds: [],
    exportGroupIds: [],
    administerGroupIds: []
  };

  for (const row of policiesResult.rows) {
    const sourceId = Number(row.source_group_id);
    const targetId = Number(row.target_group_id);
    if (!sourceIds.has(sourceId) || !Number.isInteger(targetId) || targetId <= 0) {
      continue;
    }
    if (row.can_view) access.viewGroupIds.push(targetId);
    if (row.can_create) access.createGroupIds.push(targetId);
    if (row.can_edit) access.editGroupIds.push(targetId);
    if (row.can_delete) access.deleteGroupIds.push(targetId);
    if (row.can_export) access.exportGroupIds.push(targetId);
    if (row.can_administer) access.administerGroupIds.push(targetId);
  }

  for (const key of Object.keys(access)) {
    if (key.endsWith("GroupIds") && Array.isArray(access[key])) {
      access[key] = Array.from(new Set(access[key].map(Number)));
    }
  }

  access.visibleGroups = groupRowsByIds(allActiveGroups, access.viewGroupIds);
  access.creatableGroups = groupRowsByIds(allActiveGroups, access.createGroupIds);
  access.editableGroups = groupRowsByIds(allActiveGroups, access.editGroupIds);
  access.exportableGroups = groupRowsByIds(allActiveGroups, access.exportGroupIds);

  return access;
}

async function enrichUserWithGroupAccess(user) {
  if (!user) {
    return user;
  }
  const groupAccess = await getUserGroupAccess(user);
  return {
    ...user,
    groupAccess,
    groups: groupAccess.memberships
  };
}

module.exports = {
  DEFAULT_GROUP_SLUG,
  DEFAULT_RESOURCE_TYPE,
  GROUP_ACTIONS,
  RESOURCE_TYPES,
  addUserToGroup,
  buildGroupScopeCondition,
  canUserAdministerGroup,
  canUserCreateInGroup,
  canUserDeleteGroupResource,
  canUserEditGroupResource,
  canUserExportGroup,
  canUserViewGroupResource,
  createGroup,
  enrichUserWithGroupAccess,
  getDefaultGroup,
  getEditableGroupIdsForUser,
  getExportableGroupIdsForUser,
  getGroupById,
  getGroupIdFromResource,
  getGroupPolicy,
  getUserGroupAccess,
  getUserGroupMembership,
  getVisibleGroupIdsForUser,
  listGroupMembers,
  listGroupPolicies,
  listGroups,
  listVisibleGroupOperationalSummaries,
  normalizeGroupAction,
  normalizeGroupSlug,
  normalizeResourceType,
  removeUserFromGroup,
  resolvePrimaryGroupIdForUser,
  resolveTargetGroupIdForCreate,
  updateGroup,
  upsertGroupPolicy
};
