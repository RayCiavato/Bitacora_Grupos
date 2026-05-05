const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");
const { validateFullName } = require("../src/services/namePolicy");
const { validatePasswordPolicy } = require("../src/services/passwordPolicy");

const app = createApp();
const {
  canUserEditEvent,
  canUserViewBitacora,
  canUserUploadEventAttachment,
  canUserViewFile,
  canUserEditFile,
  canUserDeleteFile
} = require("../src/services/authorization");

test("GET /health responde estado ok", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.body.timestamp);
});

test("GET /events/report sin autenticacion devuelve 401", async () => {
  const response = await request(app).get("/events/report?from=2026-01-01&to=2026-01-31");
  assert.equal(response.status, 401);
  assert.equal(response.body.error, "unauthorized");
});

test("GET /tasks sin autenticacion devuelve 401", async () => {
  const response = await request(app).get("/tasks?page=1&pageSize=20");
  assert.equal(response.status, 401);
  assert.equal(response.body.error, "unauthorized");
});

test("GET /realtime/stream sin autenticacion devuelve 401", async () => {
  const response = await request(app).get("/realtime/stream");
  assert.equal(response.status, 401);
  assert.equal(response.body.error, "unauthorized");
});

test("POST /auth/refresh sin refresh token devuelve 401", async () => {
  const response = await request(app).post("/auth/refresh");
  assert.equal(response.status, 401);
  assert.equal(response.body.error, "refresh_token_required");
});

test("GET /assets/app.min.js con perfil de navegacion directa devuelve 404", async () => {
  const response = await request(app).get("/assets/app.min.js").set("Accept", "text/html");
  assert.equal(response.status, 404);
});

test("GET /assets/app.min.js como carga normal de asset devuelve 200", async () => {
  const response = await request(app)
    .get("/assets/app.min.js?asset=web")
    .set("Host", "bitacora.local")
    .set("Referer", "http://bitacora.local/")
    .set("Accept", "*/*");
  assert.equal(response.status, 200);
});

test("GET /assets/app.min.js con Upgrade-Insecure-Requests se bloquea", async () => {
  const response = await request(app)
    .get("/assets/app.min.js?asset=web")
    .set("Host", "bitacora.local")
    .set("Referer", "http://bitacora.local/")
    .set("Accept", "*/*")
    .set("Upgrade-Insecure-Requests", "1");
  assert.equal(response.status, 404);
});

test("GET /assets/app.min.js sin token de asset devuelve 404", async () => {
  const response = await request(app).get("/assets/app.min.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /assets/app.min.js con token pero sin senales de carga legitima devuelve 404", async () => {
  const response = await request(app)
    .get("/assets/app.min.js?asset=web")
    .set("Host", "bitacora.local")
    .set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /app.js legacy bloqueado devuelve 404", async () => {
  const response = await request(app).get("/app.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("HEAD /app.js legacy bloqueado tambien devuelve 404", async () => {
  const response = await request(app).head("/app.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /assets/security.min.js sin token de asset devuelve 404", async () => {
  const response = await request(app).get("/assets/security.min.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /assets/security.min.js como asset controlado devuelve 200", async () => {
  const response = await request(app)
    .get("/assets/security.min.js?asset=sec")
    .set("Host", "bitacora.local")
    .set("Referer", "http://bitacora.local/")
    .set("Accept", "*/*");
  assert.equal(response.status, 200);
});

test("GET /assets/tasks.min.js como asset controlado devuelve 200", async () => {
  const response = await request(app)
    .get("/assets/tasks.min.js?asset=tasks")
    .set("Host", "bitacora.local")
    .set("Referer", "http://bitacora.local/")
    .set("Accept", "*/*");
  assert.equal(response.status, 200);
});

test("GET /tareas sirve index con referencias a assets minificados", async () => {
  const response = await request(app).get("/tareas");
  assert.equal(response.status, 200);
  assert.match(String(response.text || ""), /\/assets\/app\.min\.js\?asset=web&v=26/);
  assert.match(String(response.text || ""), /\/assets\/tasks\.min\.js\?asset=tasks&v=26/);
  assert.match(String(response.text || ""), /\/assets\/security\.min\.js\?asset=sec/);
  assert.doesNotMatch(String(response.text || ""), /\/tasks\.js\?asset=tasks/);
});

test("service worker usa cache versionada para invalidar bundles antiguos", () => {
  const swPath = path.join(__dirname, "..", "src", "public", "sw.js");
  const swSource = fs.readFileSync(swPath, "utf8");

  assert.match(swSource, /bitacora-v26/);
  assert.match(swSource, /\/assets\/app\.min\.js\?asset=web&v=26/);
  assert.match(swSource, /\/assets\/tasks\.min\.js\?asset=tasks&v=26/);
  assert.doesNotMatch(swSource, /bitacora-v24/);
});

test("app.min.js esta minimizado y sin source map publico", () => {
  const appMinPath = path.join(__dirname, "..", "src", "public", "assets", "app.min.js");
  const appMinSource = fs.readFileSync(appMinPath, "utf8");
  const nonEmptyLines = appMinSource.split(/\r?\n/).filter((line) => line.trim().length > 0);

  assert.equal(nonEmptyLines.length, 1);
  assert.equal(appMinSource.includes("sourceMappingURL"), false);
});

test("assets frontend minificados conservan sintaxis valida", () => {
  for (const assetName of ["app.min.js", "tasks.min.js"]) {
    const assetPath = path.join(__dirname, "..", "src", "public", "assets", assetName);
    const result = spawnSync(process.execPath, ["--check", assetPath], { encoding: "utf8" });

    assert.equal(result.status, 0, `${assetName} no parsea: ${result.stderr || result.stdout}`);
  }
});

test("assets frontend no exponen patrones peligrosos ni diccionarios internos", () => {
  const assetNames = ["app.min.js", "tasks.min.js"];
  const unsafeRuntimePatterns = [
    /\binnerHTML\b/,
    /\bouterHTML\b/,
    /\binsertAdjacentHTML\b/,
    /\beval\s*\(/,
    /\bnew\s+Function\b/,
    /\bFunction\s*\(/,
    /sourceMappingURL/,
    /debugger/,
    /console\./
  ];
  const sensitiveStrings = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "n1njahack2026",
    "bitacora2026",
    "password123",
    "qwerty123",
    "changeme",
    "cannot_change_own_role",
    "last_admin_not_allowed",
    "correlation_self_not_allowed",
    "target_event_not_found",
    "invalid_relation_type",
    "correlation_already_exists",
    "task_not_found",
    "user_not_found",
    "grupo privado",
    "Telegram interactivo",
    "sessionCapabilities",
    "rolePermissionMetadata",
    "rolePermissionPolicies",
    "rolePermissionLimits",
    "rolePermissionUpdated",
    "auditItemsById",
    "eventCorrelationDraft",
    "eventCorrelationSearchResults",
    "selectedEventPermissions",
    "activeEventDetailPayload",
    "authSection",
    "dashboardSection",
    "tasksSection",
    "tasksFilterStatus",
    "eventCorrelationSearch",
    "auditSection",
    "settingsSection",
    "telegramLinkBtn",
    "notificationsDropdown",
    "__bitacoraDom",
    "atob(",
    "getElementById",
    "querySelector",
    "querySelectorAll",
    "closest(",
    "matches("
  ];

  for (const assetName of assetNames) {
    const assetPath = path.join(__dirname, "..", "src", "public", "assets", assetName);
    const source = fs.readFileSync(assetPath, "utf8");

    for (const pattern of unsafeRuntimePatterns) {
      assert.equal(pattern.test(source), false, `${assetName} contiene ${pattern}`);
    }

    for (const value of sensitiveStrings) {
      assert.equal(source.includes(value), false, `${assetName} contiene ${value}`);
    }
  }
});

test("GET *.map en produccion devuelve 404", async () => {
  const response = await request(app).get("/app.js.map").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /.env devuelve 404 generico", async () => {
  const response = await request(app).get("/.env");
  assert.equal(response.status, 404);
  assert.ok(!String(response.text || "").includes("Cannot GET"));
});

test("GET /src/index.js devuelve 404 generico", async () => {
  const response = await request(app).get("/src/index.js");
  assert.equal(response.status, 404);
});

test("Rutas internas sensibles devuelven 404 Not found en GET/HEAD/POST", async () => {
  const sensitivePaths = [
    "/.env",
    "/src",
    "/routes",
    "/controllers",
    "/services",
    "/config",
    "/logs",
    "/backups",
    "/uploads/",
    "/uploads/archivo.js",
    "/public/",
    "/package.json",
    "/docker-compose.yml",
    "/.git"
  ];

  for (const routePath of sensitivePaths) {
    const getResponse = await request(app).get(routePath);
    assert.equal(getResponse.status, 404);
    assert.equal(String(getResponse.text || "").trim(), "Not found");

    const headResponse = await request(app).head(routePath);
    assert.equal(headResponse.status, 404);

    const postResponse = await request(app).post(routePath).send({ probe: true });
    assert.equal(postResponse.status, 404);
    assert.equal(String(postResponse.text || "").trim(), "Not found");
  }
});

test("GET /package.json devuelve 404 generico", async () => {
  const response = await request(app).get("/package.json");
  assert.equal(response.status, 404);
  assert.ok(!String(response.text || "").includes("name"));
});

test("GET /config.js devuelve 404 generico", async () => {
  const response = await request(app).get("/config.js");
  assert.equal(response.status, 404);
});

test("GET /server.js devuelve 404 generico", async () => {
  const response = await request(app).get("/server.js");
  assert.equal(response.status, 404);
});

test("GET /preview-dashboard.html devuelve 404 en entorno publico", async () => {
  const response = await request(app).get("/preview-dashboard.html");
  assert.equal(response.status, 404);
});

test("GET con intento de path traversal devuelve 404", async () => {
  const response = await request(app).get("/..%2F..%2Fetc%2Fpasswd");
  assert.equal(response.status, 404);
});

test("GET /auth/inexistente devuelve 404 json sin stack", async () => {
  const response = await request(app).get("/auth/inexistente");
  assert.equal(response.status, 404);
  assert.equal(response.body.error, "not_found");
});

test("Politica de nombre rechaza *23-102", () => {
  const result = validateFullName("*23-102");
  assert.equal(result.valid, false);
});

test("Politica de nombre acepta formatos validos y normaliza espacios", () => {
  const names = ["Juan Perez", "Ana Maria", "Pedro-01", "Usuario 23-102"];
  names.forEach((name) => {
    const result = validateFullName(name);
    assert.equal(result.valid, true);
  });

  const normalized = validateFullName("  Juan    Perez  ");
  assert.equal(normalized.valid, true);
  assert.equal(normalized.value, "Juan Perez");
});

test("Politica de password rechaza contrasena debil", () => {
  const weak = validatePasswordPolicy("Password123", {
    email: "admin@bitacora.local",
    name: "Administrador"
  });
  assert.equal(weak.valid, false);
});

test("Politica de password acepta contrasena robusta", () => {
  const strong = validatePasswordPolicy("N1njaHack@2026!", {
    email: "admin@bitacora.local",
    name: "Administrador"
  });
  assert.equal(strong.valid, true);
});

test("Permisos: usuario normal puede editar su propio registro", () => {
  const canEditOwn = canUserEditEvent({ sub: 10, role: "funcionario" }, 10);
  assert.equal(canEditOwn, true);
});

test("Permisos: usuario normal no puede editar registros ajenos", () => {
  const canEditOther = canUserEditEvent({ sub: 10, role: "funcionario" }, 11);
  assert.equal(canEditOther, false);
});

test("Permisos: administrador puede editar cualquier registro", () => {
  const canEditAny = canUserEditEvent({ sub: 1, role: "admin" }, 9999);
  assert.equal(canEditAny, true);
});

test("Permisos bitacora: funcionario puede ver bitacoras del panel", () => {
  const canView = canUserViewBitacora(
    { sub: 10, role: "funcionario" },
    { id: 55, encargado_id: 11 }
  );
  assert.equal(canView, true);
});

test("Permisos adjuntos: administrador puede subir adjuntos a cualquier registro", () => {
  const canUploadAny = canUserUploadEventAttachment({ sub: 1, role: "admin" }, 9999);
  assert.equal(canUploadAny, true);
});

test("Permisos adjuntos: usuario normal puede subir adjuntos solo a sus registros", () => {
  const canUploadOwn = canUserUploadEventAttachment({ sub: 10, role: "funcionario" }, 10);
  const canUploadOther = canUserUploadEventAttachment({ sub: 10, role: "funcionario" }, 11);
  assert.equal(canUploadOwn, true);
  assert.equal(canUploadOther, false);
});

test("Permisos archivos: cualquier usuario autenticado puede visualizar", () => {
  const canView = canUserViewFile({ sub: 10, role: "funcionario" }, { owner_id: 99 });
  assert.equal(canView, true);
});

test("Permisos archivos: solo owner o admin puede editar/eliminar", () => {
  const file = { owner_id: 44 };
  assert.equal(canUserEditFile({ sub: 44, role: "funcionario" }, file), true);
  assert.equal(canUserDeleteFile({ sub: 44, role: "funcionario" }, file), true);
  assert.equal(canUserEditFile({ sub: 11, role: "funcionario" }, file), false);
  assert.equal(canUserDeleteFile({ sub: 11, role: "funcionario" }, file), false);
  assert.equal(canUserEditFile({ sub: 1, role: "admin" }, file), true);
  assert.equal(canUserDeleteFile({ sub: 1, role: "admin" }, file), true);
});

require("./tasks.module.test");
require("./rbac.settings.test");
require("./attachments.preview.test");
require("./eventCorrelations.test");
require("./telegramPolling.test");
