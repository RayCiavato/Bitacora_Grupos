const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const ExcelJS = require("exceljs");

require("./_env");
const { config } = require("../src/config");
const { createAccessToken } = require("../src/services/tokens");
const { createApp } = require("../src/index");
const { pool } = require("../src/db");

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
    name: "Funcionario Uno",
    email: "funcionario1@bitacora.local",
    role: "funcionario",
    token_version: 0
  },
  {
    id: 4,
    name: "Funcionario Dos",
    email: "funcionario2@bitacora.local",
    role: "funcionario",
    token_version: 0
  }
]);

const TASKS_FIXTURE = Object.freeze([
  {
    id: 101,
    title: "Documento mensual",
    description: "Consolidar reporte operativo",
    status: "sin_realizar",
    priority: "media",
    start_date: "2026-04-01",
    due_date: "2026-04-10",
    created_by: 3,
    assigned_to: null,
    metadata: {},
    created_at: "2026-04-01T10:00:00.000Z",
    updated_at: "2026-04-01T10:00:00.000Z",
    deleted_at: null
  },
  {
    id: 102,
    title: "Revision de inventario",
    description: "Validar inventario y cargar hallazgos",
    status: "en_proceso",
    priority: "alta",
    start_date: "2026-04-02",
    due_date: "2026-04-12",
    created_by: 2,
    assigned_to: 3,
    metadata: {},
    created_at: "2026-04-02T10:00:00.000Z",
    updated_at: "2026-04-02T10:00:00.000Z",
    deleted_at: null
  },
  {
    id: 103,
    title: "Gestion de proveedores",
    description: "Contactar proveedores pendientes",
    status: "pendiente_revision",
    priority: "baja",
    start_date: "2026-04-03",
    due_date: "2026-04-13",
    created_by: 4,
    assigned_to: null,
    metadata: {},
    created_at: "2026-04-03T10:00:00.000Z",
    updated_at: "2026-04-03T10:00:00.000Z",
    deleted_at: null
  },
  {
    id: 104,
    title: "Plan anual",
    description: "Actualizar plan anual de trabajo",
    status: "completada",
    priority: "alta",
    start_date: "2026-04-04",
    due_date: "2026-04-20",
    created_by: 1,
    assigned_to: 2,
    metadata: {},
    created_at: "2026-04-04T10:00:00.000Z",
    updated_at: "2026-04-04T10:00:00.000Z",
    deleted_at: null
  },
  {
    id: 105,
    title: "Tarea borrada",
    description: "No debe verse en listados",
    status: "cancelada",
    priority: "media",
    start_date: "2026-03-01",
    due_date: "2026-03-15",
    created_by: 1,
    assigned_to: null,
    metadata: {},
    created_at: "2026-03-01T10:00:00.000Z",
    updated_at: "2026-03-05T10:00:00.000Z",
    deleted_at: "2026-03-06T10:00:00.000Z"
  }
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toTaskSelectRow(task, usersById) {
  const creator = usersById.get(task.created_by) || null;
  const assignee = task.assigned_to ? usersById.get(task.assigned_to) || null : null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.start_date,
    dueDate: task.due_date,
    metadata: clone(task.metadata || {}),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    createdById: creator?.id || null,
    createdByName: creator?.name || "",
    createdByEmail: creator?.email || "",
    assignedToId: assignee?.id || null,
    assignedToName: assignee?.name || "",
    assignedToEmail: assignee?.email || ""
  };
}

function createFakeTasksDb() {
  let users = [];
  let usersById = new Map();
  let tasks = [];
  let auditLogs = [];
  let nextTaskId = 200;

  function reset() {
    users = clone(USERS_FIXTURE);
    usersById = new Map(users.map((user) => [user.id, user]));
    tasks = clone(TASKS_FIXTURE);
    auditLogs = [];
    nextTaskId = 200;
  }

  function getParam(params, index) {
    return params[Number(index) - 1];
  }

  function applyTaskWhere(sql, params) {
    let filtered = tasks.slice();

    if (/t\.deleted_at is null/i.test(sql)) {
      filtered = filtered.filter((task) => !task.deleted_at);
    }

    const visibilityMatch = sql.match(/\(t\.created_by = \$(\d+) or t\.assigned_to = \$(\d+)\)/i);
    if (visibilityMatch) {
      const createdBy = Number(getParam(params, visibilityMatch[1]));
      const assignedTo = Number(getParam(params, visibilityMatch[2]));
      filtered = filtered.filter(
        (task) => Number(task.created_by) === createdBy || Number(task.assigned_to) === assignedTo
      );
    }

    const statusMatch = sql.match(/t\.status = \$(\d+)/i);
    if (statusMatch) {
      const expected = String(getParam(params, statusMatch[1]));
      filtered = filtered.filter((task) => task.status === expected);
    }

    const priorityMatch = sql.match(/t\.priority = \$(\d+)/i);
    if (priorityMatch) {
      const expected = String(getParam(params, priorityMatch[1]));
      filtered = filtered.filter((task) => task.priority === expected);
    }

    const createdByFilterMatch = sql.match(/and t\.created_by = \$(\d+)/i);
    if (createdByFilterMatch) {
      const expected = Number(getParam(params, createdByFilterMatch[1]));
      filtered = filtered.filter((task) => Number(task.created_by) === expected);
    }

    const assignedToFilterMatch = sql.match(/and t\.assigned_to = \$(\d+)/i);
    if (assignedToFilterMatch) {
      const expected = Number(getParam(params, assignedToFilterMatch[1]));
      filtered = filtered.filter((task) => Number(task.assigned_to) === expected);
    }

    const startFromMatch = sql.match(/t\.start_date >= \$(\d+)/i);
    if (startFromMatch) {
      const expected = String(getParam(params, startFromMatch[1]));
      filtered = filtered.filter((task) => task.start_date && task.start_date >= expected);
    }

    const startToMatch = sql.match(/t\.start_date <= \$(\d+)/i);
    if (startToMatch) {
      const expected = String(getParam(params, startToMatch[1]));
      filtered = filtered.filter((task) => task.start_date && task.start_date <= expected);
    }

    const dueFromMatch = sql.match(/t\.due_date >= \$(\d+)/i);
    if (dueFromMatch) {
      const expected = String(getParam(params, dueFromMatch[1]));
      filtered = filtered.filter((task) => task.due_date && task.due_date >= expected);
    }

    const dueToMatch = sql.match(/t\.due_date <= \$(\d+)/i);
    if (dueToMatch) {
      const expected = String(getParam(params, dueToMatch[1]));
      filtered = filtered.filter((task) => task.due_date && task.due_date <= expected);
    }

    const searchMatch = sql.match(
      /\(lower\(t\.title\) like \$(\d+) or lower\(t\.description\) like \$(\d+)\)/i
    );
    if (searchMatch) {
      const needle = String(getParam(params, searchMatch[1]) || "")
        .toLowerCase()
        .replace(/%/g, "");
      filtered = filtered.filter((task) => {
        const title = String(task.title || "").toLowerCase();
        const description = String(task.description || "").toLowerCase();
        return title.includes(needle) || description.includes(needle);
      });
    }

    return filtered;
  }

  function compareBySortColumn(left, right, sql) {
    const sortMatch = sql.match(/order by\s+(t\.[a-z_]+)\s+(asc|desc),\s*t\.id desc/i);
    if (!sortMatch) {
      return Number(right.id) - Number(left.id);
    }

    const sortColumn = String(sortMatch[1] || "").toLowerCase();
    const direction = String(sortMatch[2] || "desc").toLowerCase() === "asc" ? 1 : -1;
    const valueByColumn = (task) => {
      switch (sortColumn) {
        case "t.created_at":
          return task.created_at;
        case "t.updated_at":
          return task.updated_at;
        case "t.due_date":
          return task.due_date;
        case "t.start_date":
          return task.start_date;
        case "t.status":
          return task.status;
        case "t.priority":
          return task.priority;
        case "t.title":
          return task.title;
        default:
          return task.updated_at;
      }
    };

    const leftValue = valueByColumn(left) ?? "";
    const rightValue = valueByColumn(right) ?? "";
    if (leftValue < rightValue) {
      return -1 * direction;
    }
    if (leftValue > rightValue) {
      return 1 * direction;
    }
    return Number(right.id) - Number(left.id);
  }

  function applyLimitOffset(sql, params, rows) {
    let limit = rows.length;
    let offset = 0;

    const limitMatch = sql.match(/limit \$(\d+)/i);
    if (limitMatch) {
      limit = Number(getParam(params, limitMatch[1])) || rows.length;
    }

    const offsetMatch = sql.match(/offset \$(\d+)/i);
    if (offsetMatch) {
      offset = Number(getParam(params, offsetMatch[1])) || 0;
    }

    return rows.slice(offset, offset + limit);
  }

  async function query(sqlText, params = []) {
    const sql = String(sqlText).replace(/\s+/g, " ").trim();
    const lower = sql.toLowerCase();

    if (lower.startsWith("select id, name, email, role, token_version from users")) {
      const userId = Number(params[0]);
      const user = usersById.get(userId);
      return {
        rowCount: user ? 1 : 0,
        rows: user ? [clone(user)] : []
      };
    }

    if (lower.startsWith("select id, name, email from users")) {
      const userId = Number(params[0]);
      const user = usersById.get(userId);
      return {
        rowCount: user ? 1 : 0,
        rows: user
          ? [
              {
                id: user.id,
                name: user.name,
                email: user.email
              }
            ]
          : []
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

    if (lower.startsWith("insert into tasks")) {
      const newTask = {
        id: nextTaskId,
        title: String(params[0]),
        description: String(params[1]),
        status: String(params[2]),
        priority: String(params[3]),
        start_date: params[4] || null,
        due_date: params[5] || null,
        created_by: Number(params[6]),
        assigned_to: params[7] ? Number(params[7]) : null,
        metadata: params[8] ? JSON.parse(params[8]) : {},
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      tasks.push(newTask);
      nextTaskId += 1;
      return { rowCount: 1, rows: [{ id: newTask.id }] };
    }

    if (lower.startsWith("update tasks set deleted_at = now()")) {
      const taskId = Number(params[0]);
      const task = tasks.find((item) => item.id === taskId && !item.deleted_at);
      if (!task) {
        return { rowCount: 0, rows: [] };
      }
      task.deleted_at = new Date().toISOString();
      task.updated_at = new Date().toISOString();
      return { rowCount: 1, rows: [] };
    }

    if (lower.startsWith("update tasks set status = $2")) {
      const taskId = Number(params[0]);
      const task = tasks.find((item) => item.id === taskId && !item.deleted_at);
      if (!task) {
        return { rowCount: 0, rows: [] };
      }
      task.status = String(params[1]);
      task.updated_at = new Date().toISOString();
      return { rowCount: 1, rows: [] };
    }

    if (lower.startsWith("update tasks set ")) {
      const taskId = Number(params[0]);
      const task = tasks.find((item) => item.id === taskId && !item.deleted_at);
      if (!task) {
        return { rowCount: 0, rows: [] };
      }

      const setMatch = sql.match(/update tasks set (.+) where id = \$1/i);
      if (!setMatch) {
        throw new Error(`No se pudo parsear UPDATE en test double: ${sql}`);
      }

      const assignments = String(setMatch[1])
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);

      assignments.forEach((assignment) => {
        const assignmentMatch = assignment.match(/^([a-z_]+)\s*=\s*\$(\d+)(?:::\w+)?$/i);
        if (!assignmentMatch) {
          return;
        }

        const column = String(assignmentMatch[1]).toLowerCase();
        const value = getParam(params, assignmentMatch[2]);

        if (column === "title") {
          task.title = String(value);
        }
        if (column === "description") {
          task.description = String(value);
        }
        if (column === "status") {
          task.status = String(value);
        }
        if (column === "priority") {
          task.priority = String(value);
        }
        if (column === "start_date") {
          task.start_date = value || null;
        }
        if (column === "due_date") {
          task.due_date = value || null;
        }
        if (column === "assigned_to") {
          task.assigned_to = value ? Number(value) : null;
        }
        if (column === "metadata") {
          task.metadata = value ? JSON.parse(value) : {};
        }
      });

      task.updated_at = new Date().toISOString();
      return { rowCount: 1, rows: [] };
    }

    if (lower.startsWith("select count(*)::int as total from tasks t where")) {
      const filtered = applyTaskWhere(lower, params);
      return {
        rowCount: 1,
        rows: [{ total: filtered.length }]
      };
    }

    if (lower.startsWith("select status, count(*)::int as total from tasks t where")) {
      const filtered = applyTaskWhere(lower, params);
      const grouped = new Map();
      filtered.forEach((task) => {
        grouped.set(task.status, (grouped.get(task.status) || 0) + 1);
      });
      return {
        rowCount: grouped.size,
        rows: Array.from(grouped.entries()).map(([status, total]) => ({ status, total }))
      };
    }

    if (lower.startsWith("select priority, count(*)::int as total from tasks t where")) {
      const filtered = applyTaskWhere(lower, params);
      const grouped = new Map();
      filtered.forEach((task) => {
        grouped.set(task.priority, (grouped.get(task.priority) || 0) + 1);
      });
      return {
        rowCount: grouped.size,
        rows: Array.from(grouped.entries()).map(([priority, total]) => ({ priority, total }))
      };
    }

    if (lower.includes("from tasks t join users creator")) {
      if (lower.includes("where t.id = $1")) {
        const taskId = Number(params[0]);
        const task = tasks.find((item) => item.id === taskId && !item.deleted_at);
        return {
          rowCount: task ? 1 : 0,
          rows: task ? [toTaskSelectRow(task, usersById)] : []
        };
      }

      const filtered = applyTaskWhere(lower, params).sort((left, right) =>
        compareBySortColumn(left, right, lower)
      );
      const paged = applyLimitOffset(lower, params, filtered);
      const rows = paged.map((task) => toTaskSelectRow(task, usersById));
      return {
        rowCount: rows.length,
        rows
      };
    }

    throw new Error(`SQL no soportado por el doble de prueba: ${sql}`);
  }

  reset();
  return {
    reset,
    query,
    getAuditLogs: () => clone(auditLogs),
    getTasks: () => clone(tasks)
  };
}

function buildSessionCookies(user, options = {}) {
  const csrfToken = options.csrfToken || `csrf-${user.id}`;
  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    name: user.name,
    token_version: user.token_version
  });

  const cookies = [`${config.authCookieName}=${accessToken}`];
  if (options.includeCsrfCookie !== false) {
    cookies.push(`${config.csrfCookieName}=${csrfToken}`);
  }

  if (options.includeRefreshCookie) {
    cookies.push(`${config.refreshCookieName}=refresh-${user.id}`);
  }

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

async function parseXlsxTaskRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet("Tareas") || workbook.worksheets[0];
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    rows.push({
      id: Number(row.getCell(1).value),
      title: String(row.getCell(2).value || ""),
      description: String(row.getCell(3).value || "")
    });
  });
  return rows;
}

function binaryParser(res, callback) {
  res.setEncoding("binary");
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    callback(null, Buffer.from(data, "binary"));
  });
}

test("TASKS module: QA, AppSec y hardening", async (t) => {
  const fakeDb = createFakeTasksDb();
  const originalPoolQuery = pool.query.bind(pool);
  pool.query = (...args) => fakeDb.query(...args);
  t.after(() => {
    pool.query = originalPoolQuery;
  });

  const admin = USERS_FIXTURE[0];
  const supervisor = USERS_FIXTURE[1];
  const funcionario = USERS_FIXTURE[2];
  const funcionario2 = USERS_FIXTURE[3];

  await t.test("rechaza acceso no autenticado y mutaciones sin CSRF", async () => {
    fakeDb.reset();
    const app = createApp();

    const unauth = await request(app).get("/tasks?page=1&pageSize=20");
    assert.equal(unauth.status, 401);
    assert.equal(unauth.body.error, "unauthorized");

    const noCsrf = await request(app)
      .post("/tasks")
      .set("Cookie", buildSessionCookies(admin).cookies.join("; "))
      .send({
        title: "Nueva tarea",
        description: "Prueba de csrf"
      });
    assert.equal(noCsrf.status, 403);
    assert.equal(noCsrf.body.error, "invalid_csrf_token");
  });

  await t.test("funcionario solo ve tareas propias/asignadas y no soft deleted", async () => {
    fakeDb.reset();
    const app = createApp();

    const response = await attachSession(
      request(app).get("/tasks?page=1&pageSize=20"),
      funcionario,
      { includeCsrfHeader: false }
    );

    assert.equal(response.status, 200);
    const ids = response.body.items.map((item) => Number(item.id)).sort((a, b) => a - b);
    assert.deepEqual(ids, [101, 102]);
  });

  await t.test("IDOR: funcionario no puede ver, editar ni borrar tareas de terceros", async () => {
    fakeDb.reset();
    const app = createApp();

    const viewOther = await attachSession(request(app).get("/tasks/103"), funcionario, {
      includeCsrfHeader: false
    });
    assert.equal(viewOther.status, 404);
    assert.equal(viewOther.body.error, "task_not_found");

    const editOther = await attachSession(request(app).patch("/tasks/103"), funcionario).send({
      title: "Intento no autorizado"
    });
    assert.equal(editOther.status, 403);
    assert.equal(editOther.body.error, "forbidden");

    const deleteOther = await attachSession(request(app).delete("/tasks/103"), funcionario);
    assert.equal(deleteOther.status, 403);
    assert.equal(deleteOther.body.error, "forbidden");
  });

  await t.test("funcionario no puede asignar tareas a terceros", async () => {
    fakeDb.reset();
    const app = createApp();

    const response = await attachSession(request(app).post("/tasks"), funcionario).send({
      title: "Intento asignacion",
      description: "Debe bloquearse por permisos",
      assignedTo: funcionario2.id
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error, "forbidden");
  });

  await t.test("supervisor tiene visibilidad global y no elimina tareas ajenas", async () => {
    fakeDb.reset();
    const app = createApp();

    const list = await attachSession(
      request(app).get("/tasks?page=1&pageSize=20"),
      supervisor,
      { includeCsrfHeader: false }
    );
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 4);

    const deleteOther = await attachSession(request(app).delete("/tasks/103"), supervisor);
    assert.equal(deleteOther.status, 403);
    assert.equal(deleteOther.body.error, "forbidden");
  });

  await t.test("admin puede crear/editar/cambiar estado/eliminar tareas", async () => {
    fakeDb.reset();
    const app = createApp();

    const createResponse = await attachSession(request(app).post("/tasks"), admin).send({
      title: "Tarea admin",
      description: "Flujo completo",
      assignedTo: funcionario.id,
      priority: "alta"
    });
    assert.equal(createResponse.status, 201);
    const newTaskId = Number(createResponse.body.id);
    assert.ok(Number.isInteger(newTaskId));

    const patchResponse = await attachSession(request(app).patch(`/tasks/${newTaskId}`), admin).send({
      description: "Flujo completo actualizado",
      priority: "media"
    });
    assert.equal(patchResponse.status, 200);
    assert.equal(patchResponse.body.priority, "media");

    const statusResponse = await attachSession(
      request(app).patch(`/tasks/${newTaskId}/status`),
      admin
    ).send({
      status: "completada"
    });
    assert.equal(statusResponse.status, 200);
    assert.equal(statusResponse.body.status, "completada");

    const deleteResponse = await attachSession(request(app).delete(`/tasks/${newTaskId}`), admin);
    assert.equal(deleteResponse.status, 200);

    const detailResponse = await attachSession(
      request(app).get(`/tasks/${newTaskId}`),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(detailResponse.status, 404);
  });

  await t.test("valida negocio y rechaza payload invalido, overposting y enums invalidos", async () => {
    fakeDb.reset();
    const app = createApp();

    const badDateRange = await attachSession(request(app).post("/tasks"), admin).send({
      title: "Rango invalido",
      description: "Fechas invertidas",
      startDate: "2026-05-10",
      dueDate: "2026-05-01"
    });
    assert.equal(badDateRange.status, 400);

    const invalidStatus = await attachSession(request(app).patch("/tasks/101/status"), admin).send({
      status: "hacked"
    });
    assert.equal(invalidStatus.status, 400);

    const invalidPriority = await attachSession(request(app).post("/tasks"), admin).send({
      title: "Prioridad invalida",
      description: "Payload invalido",
      priority: "critica"
    });
    assert.equal(invalidPriority.status, 400);

    const overposting = await attachSession(request(app).post("/tasks"), admin).send({
      title: "Overposting",
      description: "No debe aceptar campos internos",
      createdBy: 999,
      deletedAt: "2026-01-01"
    });
    assert.equal(overposting.status, 400);
    assert.equal(overposting.body.error, "validation_error");
  });

  await t.test("filtros, busqueda, orden y paginacion funcionan y bloquean sort injection", async () => {
    fakeDb.reset();
    const app = createApp();

    const filtered = await attachSession(
      request(app).get("/tasks?status=en_proceso&assignedToId=3&sortBy=dueDate&sortOrder=asc&page=1&pageSize=10"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.items.length, 1);
    assert.equal(filtered.body.items[0].id, 102);

    const byCreator = await attachSession(
      request(app).get("/tasks?createdById=4&page=1&pageSize=20"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(byCreator.status, 200);
    assert.equal(byCreator.body.items.length, 1);
    assert.equal(byCreator.body.items[0].id, 103);

    const searchInjection = await attachSession(
      request(app).get("/tasks?q=' OR 1=1 --&page=1&pageSize=20"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(searchInjection.status, 200);
    assert.ok(Array.isArray(searchInjection.body.items));

    const invalidSort = await attachSession(
      request(app).get("/tasks?sortBy=created_at;DROP TABLE tasks"),
      admin,
      { includeCsrfHeader: false }
    );
    assert.equal(invalidSort.status, 400);
    assert.equal(invalidSort.body.error, "validation_error");
  });

  await t.test("stats no incluyen soft deleted", async () => {
    fakeDb.reset();
    const app = createApp();

    const stats = await attachSession(request(app).get("/tasks/stats"), admin, {
      includeCsrfHeader: false
    });
    assert.equal(stats.status, 200);
    assert.equal(stats.body.total, 4);
  });

  await t.test("export XLSX/PDF respeta permisos, scope y soft delete", async () => {
    fakeDb.reset();
    const app = createApp();

    const adminXlsx = await attachSession(
      request(app).get("/tasks/export/xlsx?sortBy=createdAt&sortOrder=asc"),
      admin,
      { includeCsrfHeader: false }
    )
      .buffer(true)
      .parse(binaryParser);
    assert.equal(adminXlsx.status, 200);
    assert.match(
      String(adminXlsx.headers["content-type"] || ""),
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
    );

    const adminRows = await parseXlsxTaskRows(adminXlsx.body);
    const adminIds = adminRows.map((row) => row.id).sort((a, b) => a - b);
    assert.deepEqual(adminIds, [101, 102, 103, 104]);
    assert.ok(!adminIds.includes(105));

    const scopeXlsx = await attachSession(
      request(app).get("/tasks/export/xlsx"),
      funcionario,
      { includeCsrfHeader: false }
    )
      .buffer(true)
      .parse(binaryParser);
    assert.equal(scopeXlsx.status, 200);
    const scopedRows = await parseXlsxTaskRows(scopeXlsx.body);
    const scopedIds = scopedRows.map((row) => row.id).sort((a, b) => a - b);
    assert.deepEqual(scopedIds, [101, 102]);

    const pdf = await attachSession(request(app).get("/tasks/export/pdf"), admin, {
      includeCsrfHeader: false
    })
      .buffer(true)
      .parse(binaryParser);
    assert.equal(pdf.status, 200);
    assert.match(String(pdf.headers["content-type"] || ""), /application\/pdf/);
  });

  await t.test("export no autenticado se rechaza y rate limit se aplica", async () => {
    fakeDb.reset();
    const app = createApp();

    const unauthExport = await request(app).get("/tasks/export/xlsx");
    assert.equal(unauthExport.status, 401);

    let lastResponse = null;
    for (let attempt = 0; attempt < 41; attempt += 1) {
      lastResponse = await request(app).get("/tasks/export/xlsx");
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse.status, 429);
    assert.equal(lastResponse.body.error, "too_many_requests");
  });

  await t.test("auditoria registra eventos clave: created/updated/status/deleted/export/assigned", async () => {
    fakeDb.reset();
    const app = createApp();

    const createResponse = await attachSession(request(app).post("/tasks"), admin).send({
      title: "Tarea auditada",
      description: "Validar trazabilidad",
      assignedTo: funcionario.id
    });
    assert.equal(createResponse.status, 201);
    const taskId = Number(createResponse.body.id);

    const updateResponse = await attachSession(request(app).patch(`/tasks/${taskId}`), admin).send({
      description: "Cambio de descripcion",
      assignedTo: funcionario2.id
    });
    assert.equal(updateResponse.status, 200);

    const statusResponse = await attachSession(request(app).patch(`/tasks/${taskId}/status`), admin).send({
      status: "en_proceso"
    });
    assert.equal(statusResponse.status, 200);

    const exportResponse = await attachSession(request(app).get("/tasks/export/xlsx"), admin, {
      includeCsrfHeader: false
    })
      .buffer(true)
      .parse(binaryParser);
    assert.equal(exportResponse.status, 200);

    const deleteResponse = await attachSession(request(app).delete(`/tasks/${taskId}`), admin);
    assert.equal(deleteResponse.status, 200);

    const actions = fakeDb
      .getAuditLogs()
      .map((entry) => entry.action)
      .sort();

    const expected = [
      "task.assigned",
      "task.assigned",
      "task.created",
      "task.deleted",
      "task.exported",
      "task.status_changed",
      "task.updated"
    ];
    expected.forEach((action) => {
      assert.ok(actions.includes(action), `accion de auditoria faltante: ${action}`);
    });
  });

  await t.test("endurecimiento frontend: no usa innerHTML inseguro en tasks.js", async () => {
    const tasksClientPath = path.join(__dirname, "..", "src", "public", "tasks.js");
    const tasksClientSource = fs.readFileSync(tasksClientPath, "utf8");
    assert.equal(tasksClientSource.includes("innerHTML"), false);
  });

  await t.test("mitigacion formula injection en export XLSX", async () => {
    fakeDb.reset();
    const app = createApp();

    const createResponse = await attachSession(request(app).post("/tasks"), admin).send({
      title: "=HYPERLINK(\"http://malicioso\")",
      description: "+SUM(1,1)"
    });
    assert.equal(createResponse.status, 201);

    const exportResponse = await attachSession(request(app).get("/tasks/export/xlsx"), admin, {
      includeCsrfHeader: false
    })
      .buffer(true)
      .parse(binaryParser);
    assert.equal(exportResponse.status, 200);

    const rows = await parseXlsxTaskRows(exportResponse.body);
    const injected = rows.find((row) => row.id === Number(createResponse.body.id));
    assert.ok(injected);
    assert.ok(injected.title.startsWith("'="));
    assert.ok(injected.description.startsWith("'+"));
  });
});
