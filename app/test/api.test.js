const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");
const { validateFullName } = require("../src/services/namePolicy");
const { validatePasswordPolicy } = require("../src/services/passwordPolicy");

const app = createApp();

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

test("GET /app.js legacy bloqueado devuelve 404", async () => {
  const response = await request(app).get("/app.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("HEAD /app.js legacy bloqueado tambien devuelve 404", async () => {
  const response = await request(app).head("/app.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /security.js sin token de asset devuelve 404", async () => {
  const response = await request(app).get("/security.js").set("Accept", "*/*");
  assert.equal(response.status, 404);
});

test("GET /security.js como asset controlado devuelve 200", async () => {
  const response = await request(app)
    .get("/security.js?asset=sec")
    .set("Host", "bitacora.local")
    .set("Referer", "http://bitacora.local/")
    .set("Accept", "*/*");
  assert.equal(response.status, 200);
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
