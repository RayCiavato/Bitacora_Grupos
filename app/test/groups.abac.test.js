const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGroupScopeCondition,
  canUserEditGroupResource,
  canUserExportGroup,
  canUserViewGroupResource
} = require("../src/services/groups");

function userWithAccess(overrides = {}) {
  return {
    id: 10,
    role: "funcionario",
    groupAccess: {
      viewGroupIds: [],
      createGroupIds: [],
      editGroupIds: [],
      deleteGroupIds: [],
      exportGroupIds: [],
      administerGroupIds: [],
      ...overrides
    }
  };
}

test("ABAC grupos: Soporte no ve Infraestructura por defecto", () => {
  const soporteUser = userWithAccess({
    memberGroupIds: [1],
    viewGroupIds: [1],
    editGroupIds: [1],
    exportGroupIds: [1]
  });

  assert.equal(canUserViewGroupResource(soporteUser, { groupId: 1 }), true);
  assert.equal(canUserViewGroupResource(soporteUser, { groupId: 2 }), false);
  assert.equal(canUserEditGroupResource(soporteUser, { groupId: 2 }), false);
  assert.equal(canUserExportGroup(soporteUser, 2), false);
});

test("ABAC grupos: Seguridad Tecnologica puede ver/exportar grupos operativos configurados", () => {
  const seguridadUser = userWithAccess({
    memberGroupIds: [3],
    viewGroupIds: [1, 2, 3],
    editGroupIds: [3],
    exportGroupIds: [1, 2, 3]
  });

  assert.equal(canUserViewGroupResource(seguridadUser, { groupId: 1 }), true);
  assert.equal(canUserViewGroupResource(seguridadUser, { groupId: 2 }), true);
  assert.equal(canUserEditGroupResource(seguridadUser, { groupId: 1 }), false);
  assert.equal(canUserExportGroup(seguridadUser, 2), true);
});

test("ABAC grupos: admin conserva override tecnico", () => {
  const adminUser = { id: 1, role: "admin", groupAccess: {} };

  assert.equal(canUserViewGroupResource(adminUser, { groupId: 999 }), true);
  assert.equal(canUserEditGroupResource(adminUser, { groupId: 999 }), true);
  assert.equal(canUserExportGroup(adminUser, 999), true);
});

test("ABAC grupos: scope SQL sin grupos visibles niega por defecto", () => {
  const params = [];
  const condition = buildGroupScopeCondition({
    alias: "e",
    column: "group_id",
    user: userWithAccess(),
    params
  });

  assert.equal(condition, "FALSE");
  assert.deepEqual(params, []);
});

test("ABAC grupos: scope SQL usa grupos visibles parametrizados", () => {
  const params = [];
  const condition = buildGroupScopeCondition({
    alias: "t",
    column: "group_id",
    user: userWithAccess({ viewGroupIds: [1, 2] }),
    params
  });

  assert.equal(condition, "t.group_id = ANY($1::bigint[])");
  assert.deepEqual(params, [[1, 2]]);
});
