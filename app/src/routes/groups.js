const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const { canUserManageUsers } = require("../services/authorization");
const {
  addUserToGroup,
  canUserAdministerGroup,
  createGroup,
  getGroupById,
  getGroupPolicy,
  getUserGroupMembership,
  listGroupMembers,
  listGroupPolicies,
  listGroups,
  removeUserFromGroup,
  updateGroup,
  upsertGroupPolicy
} = require("../services/groups");

const router = express.Router();

const groupIdSchema = z.object({
  groupId: z.coerce.number().int().positive()
});

const groupMemberParamsSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive()
});

const createGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().default("")
  })
  .strict();

const updateGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "at_least_one_field_required"
  });

const policySchema = z
  .object({
    sourceGroupId: z.coerce.number().int().positive(),
    targetGroupId: z.coerce.number().int().positive(),
    resourceType: z.string().trim().max(80).optional().default("all"),
    permissions: z
      .object({
        canView: z.boolean().default(false),
        canCreate: z.boolean().default(false),
        canEdit: z.boolean().default(false),
        canDelete: z.boolean().default(false),
        canExport: z.boolean().default(false),
        canAdminister: z.boolean().default(false)
      })
      .strict()
  })
  .strict();

const memberSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    roleInGroup: z.string().trim().max(80).optional().default("miembro")
  })
  .strict();

function hasAnyGroupAdministerAccess(user) {
  if (canUserManageUsers(user)) {
    return true;
  }
  return Array.isArray(user?.groupAccess?.administerGroupIds) && user.groupAccess.administerGroupIds.length > 0;
}

async function auditGroupAdminDenied(req, details = {}) {
  await createAuditLog({
    userId: req.user?.sub,
    action: "groups.access_denied",
    entity: "group",
    entityId: details.groupId || details.targetGroupId || null,
    metadata: {
      reason: details.reason || "forbidden",
      sourceGroupId: details.sourceGroupId || null,
      targetGroupId: details.targetGroupId || null,
      permission: details.permission || null
    },
    req
  });
}

async function ensureCanAccessGroupsPanel(req, res) {
  if (!hasAnyGroupAdministerAccess(req.user)) {
    await auditGroupAdminDenied(req, { reason: "groups_panel_forbidden" });
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

async function ensureCanAdministerGroup(req, res, groupId, reason = "group_admin_forbidden") {
  if (canUserManageUsers(req.user) || canUserAdministerGroup(req.user, groupId)) {
    return true;
  }
  await auditGroupAdminDenied(req, { groupId, reason });
  res.status(403).json({ error: "forbidden" });
  return false;
}

async function ensureCanCreateGroups(req, res) {
  if (canUserManageUsers(req.user)) {
    return true;
  }
  await auditGroupAdminDenied(req, { reason: "group_create_forbidden" });
  res.status(403).json({ error: "forbidden" });
  return false;
}

async function ensureCanUpdatePolicy(req, res, payload) {
  if (canUserManageUsers(req.user)) {
    return true;
  }

  const canAdministerBoth =
    canUserAdministerGroup(req.user, payload.sourceGroupId) &&
    canUserAdministerGroup(req.user, payload.targetGroupId);
  const isGrantingAdminister = Boolean(payload.permissions?.canAdminister);
  if (canAdministerBoth && !isGrantingAdminister) {
    return true;
  }

  await auditGroupAdminDenied(req, {
    reason: isGrantingAdminister ? "policy_administer_grant_forbidden" : "policy_update_forbidden",
    sourceGroupId: payload.sourceGroupId,
    targetGroupId: payload.targetGroupId,
    permission: isGrantingAdminister ? "canAdminister" : null
  });
  res.status(403).json({ error: "forbidden" });
  return false;
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    if (!(await ensureCanAccessGroupsPanel(req, res))) {
      return;
    }

    const groups = await listGroups({ includeInactive: true });
    const policies = await listGroupPolicies();
    return res.json({
      groups,
      policies
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    if (!(await ensureCanCreateGroups(req, res))) {
      return;
    }

    const payload = createGroupSchema.parse(req.body);
    const result = await createGroup({
      ...payload,
      actorId: Number(req.user.sub)
    });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "groups.created",
      entity: "group",
      entityId: result.group.id,
      metadata: {
        after: result.group
      },
      req
    });

    return res.status(201).json(result.group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "group_already_exists" });
    }
    return next(error);
  }
});

router.patch("/:groupId(\\d+)", authenticate, async (req, res, next) => {
  try {
    const { groupId } = groupIdSchema.parse(req.params);
    if (!(await ensureCanAdministerGroup(req, res, groupId, "group_update_forbidden"))) {
      return;
    }

    const payload = updateGroupSchema.parse(req.body);
    const before = await getGroupById(groupId);
    const result = await updateGroup(groupId, payload);
    if (result.error === "group_not_found") {
      return res.status(404).json({ error: "group_not_found" });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "groups.updated",
      entity: "group",
      entityId: result.group.id,
      metadata: {
        before,
        after: result.group
      },
      req
    });

    return res.json(result.group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/policies/access", authenticate, async (req, res, next) => {
  try {
    const payload = policySchema.parse(req.body);
    if (!(await ensureCanUpdatePolicy(req, res, payload))) {
      return;
    }

    const before = await getGroupPolicy(payload);
    const result = await upsertGroupPolicy(payload);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "groups.policy_updated",
      entity: "group_access_policy",
      entityId: result.policy.id,
      metadata: {
        before,
        after: result.policy
      },
      req
    });

    return res.json(result.policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/:groupId(\\d+)/members", authenticate, async (req, res, next) => {
  try {
    const { groupId } = groupIdSchema.parse(req.params);
    if (!(await ensureCanAdministerGroup(req, res, groupId, "group_members_view_forbidden"))) {
      return;
    }

    const members = await listGroupMembers(groupId);
    return res.json({ members });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.post("/:groupId(\\d+)/members", authenticate, async (req, res, next) => {
  try {
    const { groupId } = groupIdSchema.parse(req.params);
    if (!(await ensureCanAdministerGroup(req, res, groupId, "group_member_add_forbidden"))) {
      return;
    }

    const payload = memberSchema.parse(req.body);
    const before = await getUserGroupMembership({ groupId, userId: payload.userId });
    const result = await addUserToGroup({ groupId, ...payload });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "groups.user_added",
      entity: "user_group",
      entityId: payload.userId,
      metadata: {
        groupId,
        before,
        after: {
          groupId,
          userId: payload.userId,
          roleInGroup: payload.roleInGroup
        }
      },
      req
    });

    return res.status(201).json({ message: "Usuario asignado al grupo" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23503") {
      return res.status(404).json({ error: "user_or_group_not_found" });
    }
    return next(error);
  }
});

router.delete("/:groupId(\\d+)/members/:userId(\\d+)", authenticate, async (req, res, next) => {
  try {
    const { groupId, userId } = groupMemberParamsSchema.parse(req.params);
    if (!(await ensureCanAdministerGroup(req, res, groupId, "group_member_remove_forbidden"))) {
      return;
    }

    const before = await getUserGroupMembership({ groupId, userId });
    const result = await removeUserFromGroup({ groupId, userId });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "groups.user_removed",
      entity: "user_group",
      entityId: userId,
      metadata: {
        before,
        after: null,
        groupId
      },
      req
    });

    return res.json({ message: "Usuario removido del grupo" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { groupsRouter: router };
