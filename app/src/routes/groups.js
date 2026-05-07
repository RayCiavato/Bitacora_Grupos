const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const { canUserManageUsers } = require("../services/authorization");
const {
  addUserToGroup,
  createGroup,
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

function ensureCanAdminGroups(req, res) {
  if (!canUserManageUsers(req.user)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    if (!ensureCanAdminGroups(req, res)) {
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
    if (!ensureCanAdminGroups(req, res)) {
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
    if (!ensureCanAdminGroups(req, res)) {
      return;
    }

    const { groupId } = groupIdSchema.parse(req.params);
    const payload = updateGroupSchema.parse(req.body);
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
    if (!ensureCanAdminGroups(req, res)) {
      return;
    }

    const payload = policySchema.parse(req.body);
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
    if (!ensureCanAdminGroups(req, res)) {
      return;
    }

    const { groupId } = groupIdSchema.parse(req.params);
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
    if (!ensureCanAdminGroups(req, res)) {
      return;
    }

    const { groupId } = groupIdSchema.parse(req.params);
    const payload = memberSchema.parse(req.body);
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
        roleInGroup: payload.roleInGroup
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
    if (!ensureCanAdminGroups(req, res)) {
      return;
    }

    const { groupId, userId } = groupMemberParamsSchema.parse(req.params);
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
