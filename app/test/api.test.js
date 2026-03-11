const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");

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
