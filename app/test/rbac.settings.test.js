const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");
const { pool } = require("../src/db");
const { config } = require("../src/config");
const { createAccessToken } = require("../src/services/tokens");
const {
  getRolePermissionLimits,
  replaceRolePermissionPolicies
} = require("../src/services/authorization");
const {
  getSystemSettings,
  getSystemSettingsDefaults,
  replaceSystemSettings
} = require("../src/services/systemSettings");

const USERS_FIXTURE = Object.freeze([
  {
    id: 1,
    name: "Admin Bitacora",
    email: "admin@bitacora.local",
    role: "admin",
    token_version: 0
  },
  {
    id: 2,
    name: "Supervisor Bitacora",
    email: "supervisor@bitacora.local",
    role: "supervisor",
    token_version: 0
  },
  {
    id: 3,
    name: "Funcionario Bitacora",
    email: "funcionario@bitacora.local",
    role: "funcionario",
    token_version: 0
  }
]);

const TEMPLATES_FIXTURE = Object.freeze([
  {
    id: 11,
    name: "Plantilla Operativa Base",
    descripcion_base: "Descripcion base de prueba",
    observacion_base: "Observacion base de prueba",
    prioridad_default: "media",
    is_active: true,
    created_by: 1,
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-01T10:00:00.000Z"
  }
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resetRuntimeSecurityState() {
  replaceRolePermissionPolicies(getRolePermissionLimits(), { allowEscalation: true });
  replaceSystemSettings(getSystemSettingsDefaults());
}

function buildSessionCookies(user, options = {}) {
  const csrfToken = options.csrfToken || `csrf-${user.id}`;
  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    name: user.name,
    token_version: user.token_version
  });

  const cookies = [
    `${config.authCookieName}=${accessToken}`,
    `${config.csrfCookieName}=${csrfToken}`
  ];

  return {
    cookies,
    csrfToken
  };
}

function attachSession(requestBuilder, user, options = {}) {
  const { cookies, csrfToken } = buildSessionCookies(user, options);
  requestBuilder.set("Cookie", cookies.join("; "));
  if (options.includeCsrfHeader !== false) {
    requestBuilder.set("x-csrf-token", options.csrfHeaderValue || csrfToken);
  }
  return requestBuilder;
}

function createRbacSettingsDbDouble() {
  let usersById = new Map();
  let rolePoliciesByRole = new Map();
  let systemSettings = null;
  let eventTemplates = [];
  let auditLogs = [];

  function parseJson(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      return JSON.parse(value);
    }
    return clone(value);
  }

  function reset() {
    usersById = new Map(USERS_FIXTURE.map((user) => [Number(user.id), clone(user)]));
    rolePoliciesByRole = new Map();
    systemSettings = null;
    eventTemplates = clone(TEMPLATES_FIXTURE);
    auditLogs = [];
  }

  async function query(sqlText, params = []) {
    const sql = String(sqlText).replace(/\s+/g, " ").trim();
    const lower = sql.toLowerCase();

    if (lower.startsWith("select id, name, email, role, token_version from users where id = $1")) {
      const userId = Number(params[0]);
      const user = usersById.get(userId);
      return {
        rowCount: user ? 1 : 0,
        rows: user ? [clone(user)] : []
      };
    }

    if (lower.startsWith("select id, name, email, role from users where id = $1")) {
      const userId = Number(params[0]);
      const user = usersById.get(userId);
      return {
        rowCount: user ? 1 : 0,
        rows: user
          ? [
              {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
              }
            ]
          : []
      };
    }

    if (lower.startsWith("select id, name, email, role, mfa_enabled, created_at from users order by id asc")) {
      const rows = Array.from(usersById.values())
        .sort((left, right) => Number(left.id) - Number(right.id))
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfa_enabled: true,
          created_at: "2026-04-01T00:00:00.000Z"
        }));
      return {
        rowCount: rows.length,
        rows
      };
    }

    if (lower.startsWith("select role, permissions from role_permission_policies")) {
      const rows = Array.from(rolePoliciesByRole.values())
        .sort((left, right) => String(left.role).localeCompare(String(right.role)))
        .map((row) => ({
          role: row.role,
          permissions: clone(row.permissions)
        }));
      return {
        rowCount: rows.length,
        rows
      };
    }

    if (lower.startsWith("insert into role_permission_policies")) {
      const role = String(params[0]);
      const permissions = parseJson(params[1]) || {};
      const updatedByRaw = params[2];
      const updatedBy =
        updatedByRaw === null || updatedByRaw === undefined || updatedByRaw === ""
          ? null
          : Number(updatedByRaw);
      const now = new Date().toISOString();

      if (lower.includes("do nothing")) {
        if (!rolePoliciesByRole.has(role)) {
          rolePoliciesByRole.set(role, {
            role,
            permissions,
            updated_by: updatedBy,
            updated_at: now
          });
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }

      rolePoliciesByRole.set(role, {
        role,
        permissions,
        updated_by: updatedBy,
        updated_at: now
      });
      return { rowCount: 1, rows: [] };
    }

    if (lower.startsWith("select p.role,")) {
      const rows = Array.from(rolePoliciesByRole.values())
        .sort((left, right) => String(left.role).localeCompare(String(right.role)))
        .map((row) => {
          const user = row.updated_by ? usersById.get(Number(row.updated_by)) : null;
          return {
            role: row.role,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
            updatedByName: user?.name || null,
            updatedByEmail: user?.email || null
          };
        });
      return {
        rowCount: rows.length,
        rows
      };
    }

    if (lower.startsWith("select value_json as \"valuejson\" from system_settings")) {
      if (!systemSettings || systemSettings.setting_key !== String(params[0])) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [{ valueJson: clone(systemSettings.value_json) }]
      };
    }

    if (lower.startsWith("insert into system_settings")) {
      const settingKey = String(params[0]);
      const valueJson = parseJson(params[1]) || {};
      const updatedByRaw = params[2];
      const updatedBy =
        updatedByRaw === null || updatedByRaw === undefined || updatedByRaw === ""
          ? null
          : Number(updatedByRaw);
      const now = new Date().toISOString();

      if (lower.includes("do nothing")) {
        if (!systemSettings || systemSettings.setting_key !== settingKey) {
          systemSettings = {
            setting_key: settingKey,
            value_json: valueJson,
            updated_by: updatedBy,
            updated_at: now
          };
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }

      systemSettings = {
        setting_key: settingKey,
        value_json: valueJson,
        updated_by: updatedBy,
        updated_at: now
      };
      return { rowCount: 1, rows: [] };
    }

    if (lower.includes("from event_templates")) {
      let rows = clone(eventTemplates);
      if (lower.includes("where is_active = true")) {
        rows = rows.filter((row) => Boolean(row.is_active));
      }

      rows.sort((left, right) => {
        const leftActive = Boolean(left.is_active);
        const rightActive = Boolean(right.is_active);
        if (leftActive !== rightActive) {
          return rightActive ? 1 : -1;
        }
        return String(left.name).localeCompare(String(right.name));
      });

      return {
        rowCount: rows.length,
        rows: rows.map((row) => ({
          id: row.id,
          name: row.name,
          descripcionBase: row.descripcion_base,
          observacionBase: row.observacion_base,
          prioridadDefault: row.prioridad_default,
          isActive: Boolean(row.is_active),
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      };
    }

    if (lower.startsWith("insert into audit_logs")) {
      auditLogs.push({
        user_id: params[0] ? Number(params[0]) : null,
        action: params[1],
        entity: params[2],
        entity_id: params[3] ? Number(params[3]) : null,
        metadata: params[4] ? JSON.parse(params[4]) : {},
        ip_address: params[5] || null,
        user_agent: params[6] || null
      });
      return { rowCount: 1, rows: [] };
    }

    throw new Error(`SQL no soportado por doble RBAC/Settings: ${sql}`);
  }

  reset();

  return {
    reset,
    query,
    getAuditLogs: () => clone(auditLogs)
  };
}

test("RBAC y Configuracion: seguridad, validaciones, auditoria e integridad", async (t) => {
  resetRuntimeSecurityState();

  const fakeDb = createRbacSettingsDbDouble();
  const originalPoolQuery = pool.query.bind(pool);
  pool.query = (...args) => fakeDb.query(...args);

  t.after(() => {
    pool.query = originalPoolQuery;
    resetRuntimeSecurityState();
  });

  const app = createApp();
  const admin = USERS_FIXTURE[0];
  const supervisor = USERS_FIXTURE[1];

  await t.test("acceso denegado sin autenticacion o sin rol admin", async () => {
    fakeDb.reset();

    const unauthRbac = await request(app).get("/roles-permissions");
    assert.equal(unauthRbac.status, 401);
    assert.equal(unauthRbac.body.error, "unauthorized");

    const unauthSettings = await request(app).get("/settings");
    assert.equal(unauthSettings.status, 401);
    assert.equal(unauthSettings.body.error, "unauthorized");

    const supervisorRbac = await attachSession(
      request(app).get("/roles-permissions"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(supervisorRbac.status, 403);
    assert.equal(supervisorRbac.body.error, "forbidden");

    const supervisorSettings = await attachSession(
      request(app).get("/settings"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(supervisorSettings.status, 403);
    assert.equal(supervisorSettings.body.error, "forbidden");
  });

  await t.test("UI: capacidades de sesion bloquean acceso de no-admin a paneles admin", async () => {
    fakeDb.reset();

    const supervisorMe = await attachSession(
      request(app).get("/auth/me"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(supervisorMe.status, 200);
    assert.equal(supervisorMe.body.role, "supervisor");
    assert.equal(supervisorMe.body.capabilities.panels.configuracion, false);
    assert.equal(supervisorMe.body.capabilities.actions.users.manage, false);

    const adminMe = await attachSession(
      request(app).get("/auth/me"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(adminMe.status, 200);
    assert.equal(adminMe.body.role, "admin");
    assert.equal(adminMe.body.capabilities.panels.configuracion, true);
    assert.equal(adminMe.body.capabilities.actions.users.manage, true);
  });

  await t.test("hardening CSRF bloquea mutaciones administrativas", async () => {
    fakeDb.reset();

    const roleRead = await attachSession(
      request(app).get("/roles-permissions"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(roleRead.status, 200);

    const funcionarioPolicy = clone(roleRead.body.policies.funcionario);
    funcionarioPolicy.tareas.export = false;

    const roleNoCsrf = await attachSession(
      request(app).patch("/roles-permissions/funcionario"),
      admin,
      { includeCsrfHeader: false }
    ).send({ permissions: funcionarioPolicy });
    assert.equal(roleNoCsrf.status, 403);
    assert.equal(roleNoCsrf.body.error, "invalid_csrf_token");

    const settingsNoCsrf = await attachSession(
      request(app).patch("/settings"),
      admin,
      { includeCsrfHeader: false }
    ).send({
      dashboard: {
        eventsDays: 45
      }
    });
    assert.equal(settingsNoCsrf.status, 403);
    assert.equal(settingsNoCsrf.body.error, "invalid_csrf_token");
  });

  await t.test("RBAC: evita autoescalado, protege acciones admin y audita cambios validos", async () => {
    fakeDb.reset();

    const initialRead = await attachSession(
      request(app).get("/roles-permissions"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(initialRead.status, 200);
    assert.ok(Array.isArray(initialRead.body.roles));
    assert.ok(initialRead.body.roles.includes("admin"));
    assert.ok(initialRead.body.roles.includes("funcionario"));

    const escalationAttempt = clone(initialRead.body.policies.funcionario);
    escalationAttempt.usuarios.administer = true;
    const escalationResponse = await attachSession(
      request(app).patch("/roles-permissions/funcionario"),
      admin
    ).send({ permissions: escalationAttempt });
    assert.equal(escalationResponse.status, 400);
    assert.equal(escalationResponse.body.error, "validation_error");
    assert.equal(escalationResponse.body.details.reason, "permission_out_of_bounds");

    const adminBreakAttempt = clone(initialRead.body.policies.admin);
    adminBreakAttempt.configuracion.administer = false;
    const adminBreakResponse = await attachSession(
      request(app).patch("/roles-permissions/admin"),
      admin
    ).send({ permissions: adminBreakAttempt });
    assert.equal(adminBreakResponse.status, 400);
    assert.equal(adminBreakResponse.body.error, "validation_error");
    assert.equal(adminBreakResponse.body.details.reason, "admin_policy_required");

    const removeTaskViewAttempt = clone(initialRead.body.policies.funcionario);
    removeTaskViewAttempt.tareas.view = false;
    const removeTaskViewResponse = await attachSession(
      request(app).patch("/roles-permissions/funcionario"),
      admin
    ).send({ permissions: removeTaskViewAttempt });
    assert.equal(removeTaskViewResponse.status, 400);
    assert.equal(removeTaskViewResponse.body.error, "validation_error");
    assert.equal(removeTaskViewResponse.body.details.reason, "authenticated_policy_required");

    const validUpdate = clone(initialRead.body.policies.funcionario);
    validUpdate.informes.export = false;
    validUpdate.tareas.export = false;

    const validResponse = await attachSession(
      request(app).patch("/roles-permissions/funcionario"),
      admin
    ).send({ permissions: validUpdate });
    assert.equal(validResponse.status, 200);
    assert.equal(validResponse.body.permissions.informes.export, false);
    assert.equal(validResponse.body.permissions.tareas.export, false);

    const beforeSupervisorPolicyChange = await attachSession(
      request(app).get("/users"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(beforeSupervisorPolicyChange.status, 200);

    const supervisorPolicy = clone(initialRead.body.policies.supervisor);
    supervisorPolicy.usuarios.view = false;

    const supervisorPolicyUpdate = await attachSession(
      request(app).patch("/roles-permissions/supervisor"),
      admin
    ).send({ permissions: supervisorPolicy });
    assert.equal(supervisorPolicyUpdate.status, 200);
    assert.equal(supervisorPolicyUpdate.body.permissions.usuarios.view, false);

    const afterSupervisorPolicyChange = await attachSession(
      request(app).get("/users"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(afterSupervisorPolicyChange.status, 403);
    assert.equal(afterSupervisorPolicyChange.body.error, "forbidden");

    const afterRead = await attachSession(
      request(app).get("/roles-permissions"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(afterRead.status, 200);
    assert.equal(afterRead.body.policies.funcionario.informes.export, false);
    assert.equal(afterRead.body.policies.funcionario.tareas.export, false);
    assert.equal(afterRead.body.policies.supervisor.usuarios.view, false);

    const auditActions = fakeDb.getAuditLogs().map((entry) => entry.action);
    assert.ok(auditActions.includes("rbac.role_policy_updated"));
  });

  await t.test("Configuracion: validacion estricta, persistencia, flags y auditoria", async () => {
    fakeDb.reset();

    const initialSettings = await attachSession(
      request(app).get("/settings"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(initialSettings.status, 200);
    assert.equal(initialSettings.body.pagination.reportPageSizeDefault, 20);
    assert.equal(initialSettings.body.features.templatesEnabled, true);

    const templatesWhenEnabled = await attachSession(
      request(app).get("/templates"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(templatesWhenEnabled.status, 200);
    assert.equal(Array.isArray(templatesWhenEnabled.body), true);
    assert.equal(templatesWhenEnabled.body.length, 1);

    const tasksExportWhenEnabled = await attachSession(
      request(app).get("/tasks/export/xlsx?dueFrom=no-es-fecha"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(tasksExportWhenEnabled.status, 400);
    assert.equal(tasksExportWhenEnabled.body.error, "validation_error");

    const reportsExportWhenEnabled = await attachSession(
      request(app).get("/events/report/export"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(reportsExportWhenEnabled.status, 400);
    assert.equal(reportsExportWhenEnabled.body.error, "validation_error");

    const invalidSettings = await attachSession(request(app).patch("/settings"), admin).send({
      pagination: {
        reportPageSizeDefault: 300,
        reportPageSizeMax: 100
      }
    });
    assert.equal(invalidSettings.status, 400);
    assert.equal(invalidSettings.body.error, "validation_error");

    const validPatchPayload = {
      pagination: {
        reportPageSizeDefault: 25,
        reportPageSizeMax: 250,
        tasksPageSizeDefault: 15,
        tasksPageSizeMax: 80
      },
      dashboard: {
        eventsDays: 45,
        tasksSummaryDays: 10,
        tasksRecentLimit: 6
      },
      features: {
        templatesEnabled: false,
        taskExportsEnabled: false,
        reportExportsEnabled: false
      }
    };

    const patchResponse = await attachSession(request(app).patch("/settings"), admin).send(validPatchPayload);
    assert.equal(patchResponse.status, 200);
    assert.equal(patchResponse.body.settings.pagination.reportPageSizeDefault, 25);
    assert.equal(patchResponse.body.settings.features.templatesEnabled, false);
    assert.equal(patchResponse.body.settings.features.taskExportsEnabled, false);
    assert.equal(patchResponse.body.settings.features.reportExportsEnabled, false);

    const afterPatch = await attachSession(
      request(app).get("/settings"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(afterPatch.status, 200);
    assert.equal(afterPatch.body.pagination.tasksPageSizeMax, 80);
    assert.equal(afterPatch.body.dashboard.eventsDays, 45);

    const templatesWhenDisabled = await attachSession(
      request(app).get("/templates"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(templatesWhenDisabled.status, 200);
    assert.equal(Array.isArray(templatesWhenDisabled.body), true);
    assert.equal(templatesWhenDisabled.body.length, 0);

    const tasksExportWhenDisabled = await attachSession(
      request(app).get("/tasks/export/xlsx?dueFrom=no-es-fecha"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(tasksExportWhenDisabled.status, 403);
    assert.equal(tasksExportWhenDisabled.body.error, "forbidden");

    const reportsExportWhenDisabled = await attachSession(
      request(app).get("/events/report/export"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(reportsExportWhenDisabled.status, 403);
    assert.equal(reportsExportWhenDisabled.body.error, "forbidden");

    const runtimeSettings = getSystemSettings();
    assert.equal(runtimeSettings.features.templatesEnabled, false);
    assert.equal(runtimeSettings.features.taskExportsEnabled, false);
    assert.equal(runtimeSettings.features.reportExportsEnabled, false);
    assert.equal(runtimeSettings.pagination.reportPageSizeDefault, 25);

    const auditActions = fakeDb.getAuditLogs().map((entry) => entry.action);
    assert.ok(auditActions.includes("settings.updated"));
  });
});
