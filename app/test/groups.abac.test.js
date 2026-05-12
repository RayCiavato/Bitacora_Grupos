const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { pool } = require("../src/db");

const {
  buildGroupScopeCondition,
  canUserEditGroupResource,
  canUserExportGroup,
  canUserViewGroupResource,
  resolveTargetGroupIdForCreate
} = require("../src/services/groups");
const { ROLE_KEYS, getSessionCapabilities } = require("../src/services/authorization");
const {
  closeAllRealtimeClients,
  publishRealtimeEvent,
  registerRealtimeClient
} = require("../src/services/realtime");

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

test("ABAC grupos: helpers fallan cerrado si falta groupId", () => {
  const soporteUser = userWithAccess({
    memberGroupIds: [1],
    viewGroupIds: [1],
    editGroupIds: [1],
    exportGroupIds: [1]
  });

  assert.equal(canUserViewGroupResource(soporteUser, {}), false);
  assert.equal(canUserEditGroupResource(soporteUser, { id: 99 }), false);
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

test("ABAC grupos: scope SQL de export usa solo grupos exportables", () => {
  const params = [];
  const condition = buildGroupScopeCondition({
    alias: "t",
    column: "group_id",
    user: userWithAccess({ viewGroupIds: [1, 2], exportGroupIds: [2] }),
    params,
    action: "export"
  });

  assert.equal(condition, "t.group_id = ANY($1::bigint[])");
  assert.deepEqual(params, [[2]]);
});

test("ABAC grupos: Gerencia no tiene admin tecnico por defecto", () => {
  const gerenciaUser = userWithAccess({
    memberGroupIds: [4],
    viewGroupIds: [1, 2, 3, 4],
    exportGroupIds: [1, 2, 3, 4],
    editGroupIds: [],
    deleteGroupIds: [],
    administerGroupIds: []
  });

  assert.equal(canUserViewGroupResource(gerenciaUser, { groupId: 1 }), true);
  assert.equal(canUserEditGroupResource(gerenciaUser, { groupId: 1 }), false);
  assert.equal(canUserExportGroup(gerenciaUser, 1), true);
});

test("RBAC: no expone rol Gerencial; Gerencia se controla como grupo", () => {
  assert.equal(ROLE_KEYS.includes("gerencial"), false);
  const capabilities = getSessionCapabilities("gerencial");

  assert.equal(capabilities.panels.dashboard, true);
  assert.equal(capabilities.panels.tareas, true);
  assert.equal(capabilities.actions.users.manage, false);
  assert.equal(capabilities.actions.tasks.create, true);
  assert.equal(capabilities.actions.reports.filterByUser, false);
});

test("Realtime ABAC: no publica sin visibility y no filtra entre Soporte e Infraestructura", () => {
  closeAllRealtimeClients();
  const makeClient = (user) => {
    const req = new EventEmitter();
    req.socket = {
      setNoDelay() {},
      setKeepAlive() {},
      setTimeout() {}
    };
    const writes = [];
    const res = new EventEmitter();
    res.writableEnded = false;
    res.destroyed = false;
    res.status = () => res;
    res.setHeader = () => {};
    res.write = (chunk) => {
      writes.push(String(chunk));
      return true;
    };
    registerRealtimeClient({ req, res, user });
    return { req, res, writes };
  };

  const soporte = makeClient(userWithAccess({ viewGroupIds: [1] }));
  const infraestructura = makeClient(userWithAccess({ viewGroupIds: [2] }));
  const soporteInitialWrites = soporte.writes.length;
  const infraInitialWrites = infraestructura.writes.length;

  publishRealtimeEvent({
    kind: "task.created",
    payload: { groupId: 1 }
  });
  assert.equal(soporte.writes.length, soporteInitialWrites);
  assert.equal(infraestructura.writes.length, infraInitialWrites);

  publishRealtimeEvent({
    kind: "task.created",
    payload: { groupId: 1 },
    visibility: (viewer) => canUserViewGroupResource(viewer, { groupId: 1 })
  });
  assert.equal(soporte.writes.length, soporteInitialWrites + 1);
  assert.equal(infraestructura.writes.length, infraInitialWrites);

  closeAllRealtimeClients();
});

test("Creacion ABAC: usuario movido de General crea en su grupo actual y no cae a General", async () => {
  const originalPoolQuery = pool.query.bind(pool);
  const allGroups = [
    {
      id: 1,
      name: "General",
      slug: "general",
      description: "",
      is_system: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    {
      id: 3,
      name: "Seguridad Tecnologica",
      slug: "seguridad-tecnologica",
      description: "",
      is_system: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    }
  ];

  pool.query = async (sqlText) => {
    const sql = String(sqlText).toLowerCase().replace(/\s+/g, " ").trim();
    if (sql.startsWith("select id, name, slug, description, is_system")) {
      return { rowCount: allGroups.length, rows: allGroups };
    }
    if (sql.includes("from user_groups ug join groups g on g.id = ug.group_id")) {
      return { rowCount: 1, rows: [allGroups[1]] };
    }
    if (sql.includes("from group_access_policies p")) {
      return {
        rowCount: 1,
        rows: [
          {
            source_group_id: 3,
            target_group_id: 3,
            resource_type: "all",
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: false,
            can_export: true,
            can_administer: false
          }
        ]
      };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const result = await resolveTargetGroupIdForCreate({ id: 42, sub: 42, role: "funcionario" });
    assert.equal(result.error, null);
    assert.equal(result.groupId, 3);

    const forbidden = await resolveTargetGroupIdForCreate({ id: 42, sub: 42, role: "funcionario" }, 1);
    assert.equal(forbidden.error, "forbidden");
    assert.equal(forbidden.groupId, null);
  } finally {
    pool.query = originalPoolQuery;
  }
});

test("Creacion ABAC: multiples grupos creatables requieren seleccion explicita", async () => {
  const originalPoolQuery = pool.query.bind(pool);
  const groups = [
    {
      id: 1,
      name: "General",
      slug: "general",
      description: "",
      is_system: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    {
      id: 3,
      name: "Seguridad Tecnologica",
      slug: "seguridad-tecnologica",
      description: "",
      is_system: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    }
  ];

  pool.query = async (sqlText) => {
    const sql = String(sqlText).toLowerCase().replace(/\s+/g, " ").trim();
    if (sql.startsWith("select id, name, slug, description, is_system")) {
      return { rowCount: groups.length, rows: groups };
    }
    if (sql.includes("from user_groups ug join groups g on g.id = ug.group_id")) {
      return { rowCount: groups.length, rows: groups };
    }
    if (sql.includes("from group_access_policies p")) {
      return {
        rowCount: 2,
        rows: groups.map((group) => ({
          source_group_id: group.id,
          target_group_id: group.id,
          resource_type: "all",
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_export: true,
          can_administer: false
        }))
      };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    const result = await resolveTargetGroupIdForCreate({ id: 55, sub: 55, role: "funcionario" });
    assert.equal(result.error, "group_required");
    assert.deepEqual(result.details.availableGroupIds, [1, 3]);
  } finally {
    pool.query = originalPoolQuery;
  }
});
