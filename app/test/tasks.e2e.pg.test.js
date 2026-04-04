process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://bitacora_user:bitacora_pass@127.0.0.1:5433/bitacora_e2e";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_123456789012345678901234567890";
process.env.ALLOW_PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION || "true";
process.env.MFA_REQUIRED = process.env.MFA_REQUIRED || "false";
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");

const { config } = require("../src/config");
const { createApp } = require("../src/index");
const { pool, ensureDatabaseSchema } = require("../src/db");

const TEST_PASSWORD = "N1njaSafe!Pass2026";

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

async function parseXlsxIds(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Tareas") || workbook.worksheets[0];
  const ids = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const raw = row.getCell(1).value;
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0) {
      ids.push(id);
    }
  });
  return ids;
}

function parseCookieByName(setCookieHeaders, cookieName) {
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [];
  const entry = headers.find((value) => String(value).startsWith(`${cookieName}=`));
  if (!entry) {
    return null;
  }
  const valuePart = String(entry).split(";")[0];
  const cookieValue = valuePart.slice(`${cookieName}=`.length);
  return decodeURIComponent(cookieValue);
}

async function resetDatabase() {
  await pool.query(`
    TRUNCATE TABLE
      tasks,
      event_attachments,
      events,
      event_templates,
      refresh_tokens,
      audit_logs,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const users = [
    ["Admin Real", "admin-real@bitacora.local", "admin"],
    ["Supervisor Real", "supervisor-real@bitacora.local", "supervisor"],
    ["Funcionario Uno", "funcionario-uno@bitacora.local", "funcionario"],
    ["Funcionario Dos", "funcionario-dos@bitacora.local", "funcionario"]
  ];

  for (const user of users) {
    await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role, mfa_enabled, failed_attempts, token_version)
        VALUES ($1, $2, $3, $4::user_role, FALSE, 0, 0)
      `,
      [user[0], user[1], passwordHash, user[2]]
    );
  }
}

async function loginAs(agent, email) {
  const response = await agent.post("/auth/login").send({
    email,
    password: TEST_PASSWORD
  });

  assert.equal(response.status, 200, `login fallido para ${email}`);
  const csrfToken = parseCookieByName(response.headers["set-cookie"], config.csrfCookieName);
  assert.ok(csrfToken, "No se obtuvo cookie CSRF");
  return {
    csrfToken,
    user: response.body.user
  };
}

async function createTask(agent, csrfToken, payload) {
  return agent.post("/tasks").set("x-csrf-token", csrfToken).send(payload);
}

test("E2E real PostgreSQL + seguridad dinamica TASKS", async (t) => {
  await ensureDatabaseSchema();
  await resetDatabase();
  await seedUsers();

  t.after(async () => {
    await resetDatabase();
    await pool.end();
  });

  await t.test("DB real: tabla, constraints, indices y FKs de tasks", async () => {
    const tableResult = await pool.query(
      "SELECT to_regclass('public.tasks')::text AS table_name"
    );
    assert.equal(tableResult.rows[0].table_name, "tasks");

    const constraints = await pool.query(
      `
        SELECT conname, contype, pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        WHERE conrelid = 'tasks'::regclass
      `
    );
    const definitions = constraints.rows.map((row) => String(row.definition));
    assert.ok(
      definitions.some((definition) => definition.includes("due_date >= start_date")),
      "No se encontro CHECK de rango de fechas en tasks"
    );
    assert.ok(
      definitions.some((definition) => definition.includes("FOREIGN KEY (created_by) REFERENCES users(id)")),
      "No se encontro FK created_by -> users(id)"
    );
    assert.ok(
      definitions.some((definition) => definition.includes("FOREIGN KEY (assigned_to) REFERENCES users(id)")),
      "No se encontro FK assigned_to -> users(id)"
    );

    const indexes = await pool.query(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'tasks'
      `
    );
    const indexNames = new Set(indexes.rows.map((row) => row.indexname));
    [
      "idx_tasks_created_by",
      "idx_tasks_assigned_to",
      "idx_tasks_status",
      "idx_tasks_priority",
      "idx_tasks_due_date",
      "idx_tasks_deleted_at",
      "idx_tasks_created_at"
    ].forEach((name) => {
      assert.ok(indexNames.has(name), `Indice faltante: ${name}`);
    });

    await assert.rejects(
      pool.query(
        `
          INSERT INTO tasks (title, description, status, priority, start_date, due_date, created_by)
          VALUES ('x', 'y', 'sin_realizar', 'media', '2026-05-10', '2026-05-01', 1)
        `
      ),
      (error) => error && error.code === "23514"
    );

    await assert.rejects(
      pool.query(
        `
          INSERT INTO tasks (title, description, status, priority, created_by)
          VALUES ('x', 'y', 'sin_realizar', 'media', 9999)
        `
      ),
      (error) => error && error.code === "23503"
    );
  });

  await t.test("E2E real: login -> crear -> editar -> exportar -> eliminar", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);

    const login = await loginAs(agent, "funcionario-uno@bitacora.local");
    const createResponse = await createTask(agent, login.csrfToken, {
      title: "Tarea e2e real",
      description: "Flujo completo en PostgreSQL real",
      status: "sin_realizar",
      priority: "media"
    });
    assert.equal(createResponse.status, 201);
    const taskId = Number(createResponse.body.id);
    assert.ok(Number.isInteger(taskId));

    const patchResponse = await agent
      .patch(`/tasks/${taskId}`)
      .set("x-csrf-token", login.csrfToken)
      .send({
        description: "Descripcion editada e2e"
      });
    assert.equal(patchResponse.status, 200);
    assert.equal(patchResponse.body.description, "Descripcion editada e2e");

    const exportResponse = await agent
      .get("/tasks/export/xlsx")
      .buffer(true)
      .parse(binaryParser);
    assert.equal(exportResponse.status, 200);
    const ids = await parseXlsxIds(exportResponse.body);
    assert.ok(ids.includes(taskId));

    const deleteResponse = await agent
      .delete(`/tasks/${taskId}`)
      .set("x-csrf-token", login.csrfToken);
    assert.equal(deleteResponse.status, 200);

    const detailAfterDelete = await agent.get(`/tasks/${taskId}`);
    assert.equal(detailAfterDelete.status, 404);
  });

  await t.test("IDOR real: usuario no autorizado no accede a tareas ajenas", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();

    const ownerAgent = request.agent(app);
    const ownerLogin = await loginAs(ownerAgent, "funcionario-uno@bitacora.local");
    const ownerTask = await createTask(ownerAgent, ownerLogin.csrfToken, {
      title: "Tarea privada owner",
      description: "Debe quedar fuera de alcance para otros"
    });
    assert.equal(ownerTask.status, 201);
    const taskId = Number(ownerTask.body.id);

    const attackerAgent = request.agent(app);
    const attackerLogin = await loginAs(attackerAgent, "funcionario-dos@bitacora.local");

    const readAttempt = await attackerAgent.get(`/tasks/${taskId}`);
    assert.equal(readAttempt.status, 404);

    const editAttempt = await attackerAgent
      .patch(`/tasks/${taskId}`)
      .set("x-csrf-token", attackerLogin.csrfToken)
      .send({ title: "Intento IDOR" });
    assert.equal(editAttempt.status, 403);

    const deleteAttempt = await attackerAgent
      .delete(`/tasks/${taskId}`)
      .set("x-csrf-token", attackerLogin.csrfToken);
    assert.equal(deleteAttempt.status, 403);

    const statusAttempt = await attackerAgent
      .patch(`/tasks/${taskId}/status`)
      .set("x-csrf-token", attackerLogin.csrfToken)
      .send({ status: "completada" });
    assert.equal(statusAttempt.status, 403);
  });

  await t.test("XSS y frontend: payload se maneja sin innerHTML inseguro", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);
    const login = await loginAs(agent, "funcionario-uno@bitacora.local");

    const xssPayload = {
      title: "<img src=x onerror=alert('xss')>",
      description: "<script>alert('xss')</script>"
    };
    const createResponse = await createTask(agent, login.csrfToken, xssPayload);
    assert.equal(createResponse.status, 201);
    const taskId = Number(createResponse.body.id);

    const detailResponse = await agent.get(`/tasks/${taskId}`);
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.title, xssPayload.title);
    assert.equal(detailResponse.body.description, xssPayload.description);

    const tasksClientPath = path.join(__dirname, "..", "src", "public", "tasks.js");
    const tasksClientSource = fs.readFileSync(tasksClientPath, "utf8");
    assert.equal(tasksClientSource.includes("innerHTML"), false);
  });

  await t.test("Fuzzing de parametros y manipulacion de filtros", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);
    const login = await loginAs(agent, "funcionario-uno@bitacora.local");

    const created = await createTask(agent, login.csrfToken, {
      title: "Tarea fuzz base",
      description: "Registro base para fuzz"
    });
    assert.equal(created.status, 201);

    const sqlish = await agent.get("/tasks?q=' OR 1=1 --&page=1&pageSize=20");
    assert.equal(sqlish.status, 200);

    const badSort = await agent.get("/tasks?sortBy=created_at;DROP TABLE tasks");
    assert.equal(badSort.status, 400);

    const badEnum = await agent.get("/tasks?status=drop_table");
    assert.equal(badEnum.status, 400);

    const badPageSize = await agent.get("/tasks?pageSize=999999");
    assert.equal(badPageSize.status, 400);

    const badDateRange = await agent.get("/tasks?startFrom=2026-06-10&startTo=2026-05-01");
    assert.equal(badDateRange.status, 400);

    const forcedScope = await agent.get("/tasks?createdById=2");
    assert.equal(forcedScope.status, 200);
    assert.equal(forcedScope.body.items.length, 0);
  });

  await t.test("Soft delete real: sin bypass en lista, detalle, export y stats", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);
    const login = await loginAs(agent, "funcionario-uno@bitacora.local");

    const created = await createTask(agent, login.csrfToken, {
      title: "Tarea soft delete",
      description: "Debe desaparecer tras eliminar"
    });
    assert.equal(created.status, 201);
    const taskId = Number(created.body.id);

    const deleted = await agent
      .delete(`/tasks/${taskId}`)
      .set("x-csrf-token", login.csrfToken);
    assert.equal(deleted.status, 200);

    const list = await agent.get("/tasks");
    assert.equal(list.status, 200);
    assert.ok(!list.body.items.some((item) => Number(item.id) === taskId));

    const detail = await agent.get(`/tasks/${taskId}`);
    assert.equal(detail.status, 404);

    const stats = await agent.get("/tasks/stats");
    assert.equal(stats.status, 200);
    assert.equal(Number(stats.body.total), 0);

    const exported = await agent.get("/tasks/export/xlsx").buffer(true).parse(binaryParser);
    assert.equal(exported.status, 200);
    const ids = await parseXlsxIds(exported.body);
    assert.ok(!ids.includes(taskId));
  });

  await t.test("Abuso export y carga basica: concurrencia y rate limit", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);
    const login = await loginAs(agent, "supervisor-real@bitacora.local");

    for (let index = 0; index < 8; index += 1) {
      const created = await createTask(agent, login.csrfToken, {
        title: `Carga ${index + 1}`,
        description: `Carga concurrente ${index + 1}`,
        assignedTo: 3
      });
      assert.equal(created.status, 201);
    }

    const concurrentExports = await Promise.all(
      Array.from({ length: 10 }, () =>
        agent.get("/tasks/export/xlsx").buffer(true).parse(binaryParser)
      )
    );
    concurrentExports.forEach((response) => {
      assert.equal(response.status, 200);
    });

    const concurrentList = await Promise.all(
      Array.from({ length: 25 }, () => agent.get("/tasks?page=1&pageSize=10"))
    );
    concurrentList.forEach((response) => {
      assert.equal(response.status, 200);
    });

    const abuseResponses = [];
    for (let attempt = 0; attempt < 45; attempt += 1) {
      abuseResponses.push(await agent.get("/tasks/export/xlsx").buffer(true).parse(binaryParser));
    }
    assert.ok(abuseResponses.some((response) => response.status === 429));
  });

  await t.test("Headers de seguridad y cookies seguras del modulo", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();

    const unauth = await request(app).get("/tasks");
    assert.equal(unauth.status, 401);
    assert.match(String(unauth.headers["content-security-policy"] || ""), /default-src 'self'/);
    assert.equal(String(unauth.headers["x-content-type-options"] || "").toLowerCase(), "nosniff");
    assert.equal(String(unauth.headers["x-frame-options"] || "").toUpperCase(), "SAMEORIGIN");
    assert.equal(String(unauth.headers["referrer-policy"] || "").toLowerCase(), "no-referrer");
    assert.ok(String(unauth.headers["strict-transport-security"] || "").length > 0);

    const agent = request.agent(app);
    const login = await loginAs(agent, "funcionario-uno@bitacora.local");
    assert.ok(login.user);

    const setCookie = [].concat((await agent.post("/auth/login").send({
      email: "funcionario-uno@bitacora.local",
      password: TEST_PASSWORD
    })).headers["set-cookie"] || []);

    const accessCookieHeader = setCookie.find((value) =>
      String(value).startsWith(`${config.authCookieName}=`)
    );
    const refreshCookieHeader = setCookie.find((value) =>
      String(value).startsWith(`${config.refreshCookieName}=`)
    );

    assert.ok(accessCookieHeader && /HttpOnly/i.test(accessCookieHeader));
    assert.ok(refreshCookieHeader && /HttpOnly/i.test(refreshCookieHeader));
    assert.ok(accessCookieHeader && /SameSite=Strict/i.test(accessCookieHeader));
  });

  await t.test("Logs y auditoria: sin secretos en logs, con trazabilidad completa", async () => {
    await resetDatabase();
    await seedUsers();
    const app = createApp();
    const agent = request.agent(app);
    const login = await loginAs(agent, "funcionario-uno@bitacora.local");

    const loggerConfigSource = fs.readFileSync(
      path.join(__dirname, "..", "src", "logger.js"),
      "utf8"
    );
    assert.match(loggerConfigSource, /req\.headers\.cookie/);
    assert.match(loggerConfigSource, /req\.body\.password/);
    assert.match(loggerConfigSource, /password_hash/);
    assert.match(loggerConfigSource, /\[REDACTED\]/);

    await createTask(agent, login.csrfToken, {
      title: "Auditoria sensible",
      description: "No debe filtrar secretos"
    });
    await agent.get("/tasks");

    const auditActions = await pool.query(
      `
        SELECT action, metadata::text AS metadata_text
        FROM audit_logs
        ORDER BY id ASC
      `
    );
    const actions = auditActions.rows.map((row) => row.action);
    assert.ok(actions.includes("auth.login_success"));
    assert.ok(actions.includes("task.created"));

    const sensitiveLeaks = auditActions.rows.filter((row) =>
      /password_hash|mfa_secret|bitacora_access|bitacora_refresh/i.test(String(row.metadata_text))
    );
    assert.equal(sensitiveLeaks.length, 0);
  });
});
