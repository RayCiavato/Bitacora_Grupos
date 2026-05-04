const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");
const {
  RELATION_TYPES,
  normalizeRelationType
} = require("../src/services/eventCorrelations");

const app = createApp();

test("Correlaciones: tipos permitidos normalizan correctamente", () => {
  assert.deepEqual(
    RELATION_TYPES,
    ["seguimiento", "reincidencia", "relacionado", "actualizacion", "causa_raiz", "evidencia", "otro"]
  );
  assert.equal(normalizeRelationType("Seguimiento"), "seguimiento");
  assert.equal(normalizeRelationType("causa_raiz"), "causa_raiz");
  assert.equal(normalizeRelationType("tipo<script>"), null);
});

test("Correlaciones: endpoints requieren autenticacion", async () => {
  const listResponse = await request(app).get("/events/1/correlations");
  assert.equal(listResponse.status, 401);

  const searchResponse = await request(app).get("/events/correlations/search?q=incidente");
  assert.equal(searchResponse.status, 401);

  const createResponse = await request(app)
    .post("/events/1/correlations")
    .send({ targetEventId: 2, relationType: "seguimiento" });
  assert.equal(createResponse.status, 401);

  const deleteResponse = await request(app).delete("/events/1/correlations/1");
  assert.equal(deleteResponse.status, 401);
});
