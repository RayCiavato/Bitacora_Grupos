const { pool } = require("../db");
const {
  ROLE_KEYS,
  getRolePermissionPolicies,
  hydrateRolePermissionPoliciesFromRows,
  setRolePermissionPolicy
} = require("./authorization");

let hydrated = false;

async function ensureRolePermissionPoliciesLoaded(options = {}) {
  const force = Boolean(options.force);
  if (hydrated && !force) {
    return getRolePermissionPolicies();
  }

  const result = await pool.query(
    `
      SELECT role, permissions
      FROM role_permission_policies
      ORDER BY role ASC
    `
  );

  hydrateRolePermissionPoliciesFromRows(result.rows || []);
  hydrated = true;
  return getRolePermissionPolicies();
}

async function persistRolePermissionPolicy(role, policy, updatedBy) {
  await pool.query(
    `
      INSERT INTO role_permission_policies (role, permissions, updated_by, updated_at)
      VALUES ($1::user_role, $2::jsonb, $3, NOW())
      ON CONFLICT (role)
      DO UPDATE
      SET permissions = EXCLUDED.permissions,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
    `,
    [role, JSON.stringify(policy), updatedBy || null]
  );
}

async function updateRolePermissionPolicy(role, policy, updatedBy, options = {}) {
  await ensureRolePermissionPoliciesLoaded();

  const result = setRolePermissionPolicy(role, policy, options);
  if (!result.ok) {
    return result;
  }

  await persistRolePermissionPolicy(result.role, result.policy, updatedBy);
  hydrated = true;
  return result;
}

async function seedMissingRolePolicies(updatedBy = null) {
  await ensureRolePermissionPoliciesLoaded();
  const policies = getRolePermissionPolicies();

  for (const roleKey of ROLE_KEYS) {
    await pool.query(
      `
        INSERT INTO role_permission_policies (role, permissions, updated_by, updated_at)
        VALUES ($1::user_role, $2::jsonb, $3, NOW())
        ON CONFLICT (role) DO NOTHING
      `,
      [roleKey, JSON.stringify(policies[roleKey]), updatedBy]
    );
  }

  return policies;
}

module.exports = {
  ensureRolePermissionPoliciesLoaded,
  updateRolePermissionPolicy,
  seedMissingRolePolicies
};