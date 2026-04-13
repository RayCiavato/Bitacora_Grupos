const express = require("express");
const { z } = require("zod");
const { pool } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const {
  POLICY_ACTION_KEYS,
  POLICY_MODULE_KEYS,
  getRolePermissionMetadata,
  getRolePermissionPolicies,
  getRolePermissionLimits,
  validateRolePolicy,
  canUserAccessPanel,
  canUserManageUsers
} = require("../services/authorization");
const {
  ensureRolePermissionPoliciesLoaded,
  updateRolePermissionPolicy,
  seedMissingRolePolicies
} = require("../services/rolePoliciesStore");

const router = express.Router();

const policyActionSchema = z
  .object({
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    export: z.boolean(),
    administer: z.boolean()
  })
  .strict();

const rolePolicyShape = POLICY_MODULE_KEYS.reduce((shape, moduleKey) => {
  shape[moduleKey] = policyActionSchema;
  return shape;
}, {});

const rolePolicySchema = z.object(rolePolicyShape).strict();

const updatePolicyBodySchema = z
  .object({
    permissions: rolePolicySchema
  })
  .strict();

const roleParamSchema = z.object({
  role: z.enum(["admin", "supervisor", "funcionario"])
});

function ensureCanAdministerRbac(req, res) {
  if (!canUserAccessPanel(req.user, "usuarios") || !canUserManageUsers(req.user)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

async function readRolePolicyAuditMetadata() {
  const result = await pool.query(
    `
      SELECT
        p.role,
        p.updated_at AS "updatedAt",
        p.updated_by AS "updatedBy",
        u.name AS "updatedByName",
        u.email AS "updatedByEmail"
      FROM role_permission_policies p
      LEFT JOIN users u ON u.id = p.updated_by
      ORDER BY p.role ASC
    `
  );

  return result.rows.reduce((accumulator, row) => {
    accumulator[row.role] = {
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      updatedByName: row.updatedByName || null,
      updatedByEmail: row.updatedByEmail || null
    };
    return accumulator;
  }, {});
}

router.get("/", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanAdministerRbac(req, res)) {
      return;
    }

    await ensureRolePermissionPoliciesLoaded();
    await seedMissingRolePolicies();

    const metadata = getRolePermissionMetadata();
    const policies = getRolePermissionPolicies();
    const limits = getRolePermissionLimits();
    const auditMetadata = await readRolePolicyAuditMetadata();

    return res.json({
      ...metadata,
      policies,
      limits,
      updated: auditMetadata,
      hardening: {
        maxPrivilegeEscalation: false,
        adminCriticalActionsProtected: true
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:role", authenticate, requireRole(["admin"]), async (req, res, next) => {
  try {
    if (!ensureCanAdministerRbac(req, res)) {
      return;
    }

    const params = roleParamSchema.parse(req.params);
    const payload = updatePolicyBodySchema.parse(req.body);

    await ensureRolePermissionPoliciesLoaded();

    const validation = validateRolePolicy(params.role, payload.permissions);
    if (!validation.valid) {
      return res.status(400).json({
        error: "validation_error",
        details: {
          reason: validation.reason,
          ...(validation.detail || {})
        }
      });
    }

    const beforePolicy = getRolePermissionPolicies()[params.role];
    const updateResult = await updateRolePermissionPolicy(
      params.role,
      validation.policy,
      req.user?.sub || null
    );

    if (!updateResult.ok) {
      return res.status(400).json({
        error: "validation_error",
        details: {
          reason: updateResult.error,
          ...(updateResult.detail || {})
        }
      });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "rbac.role_policy_updated",
      entity: "role_permission_policy",
      metadata: {
        role: updateResult.role,
        before: beforePolicy,
        after: updateResult.policy,
        modulesChanged: POLICY_MODULE_KEYS.filter((moduleKey) => {
          for (const actionKey of POLICY_ACTION_KEYS) {
            if (
              Boolean(beforePolicy?.[moduleKey]?.[actionKey]) !==
              Boolean(updateResult.policy?.[moduleKey]?.[actionKey])
            ) {
              return true;
            }
          }
          return false;
        })
      },
      req
    });

    return res.json({
      message: "Permisos del rol actualizados correctamente",
      role: updateResult.role,
      permissions: updateResult.policy
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { rolesPermissionsRouter: router };
