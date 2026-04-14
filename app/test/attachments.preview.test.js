const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const request = require("supertest");

require("./_env");
const { createApp } = require("../src/index");
const { pool } = require("../src/db");
const { config } = require("../src/config");
const { createAccessToken } = require("../src/services/tokens");

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

const ATTACHMENTS_FIXTURE = Object.freeze([
  {
    id: 501,
    event_id: 901,
    uploaded_by: 3,
    owner_id: 3,
    original_name: "informe-operativo.pdf",
    stored_name: "preview-test-501.pdf",
    mime_type: "application/pdf",
    size_bytes: 1024,
    created_at: "2026-04-14T10:00:00.000Z"
  },
  {
    id: 502,
    event_id: 901,
    uploaded_by: 1,
    owner_id: 1,
    original_name: "evidencia.png",
    stored_name: "preview-test-502.png",
    mime_type: "image/png",
    size_bytes: 2048,
    created_at: "2026-04-14T09:00:00.000Z"
  },
  {
    id: 503,
    event_id: 901,
    uploaded_by: 3,
    owner_id: 3,
    original_name: "paquete.zip",
    stored_name: "preview-test-503.zip",
    mime_type: "application/zip",
    size_bytes: 512,
    created_at: "2026-04-14T08:00:00.000Z"
  }
]);

const EVENTS_FIXTURE = Object.freeze([
  {
    id: 901,
    encargado_id: 3,
    fecha: "2026-04-14"
  }
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildSessionCookies(user, options = {}) {
  const csrfToken = options.csrfToken || `csrf-${user.id}`;
  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    name: user.name,
    token_version: user.token_version
  });

  return {
    cookies: [`${config.authCookieName}=${accessToken}`, `${config.csrfCookieName}=${csrfToken}`],
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

function applyAttachmentFilters(sql, params, attachments) {
  let index = 0;
  let filtered = attachments.slice();

  if (sql.includes("lower(ea.original_name) like lower($")) {
    const value = String(params[index] || "").toLowerCase().replace(/%/g, "");
    filtered = filtered.filter((row) => String(row.original_name).toLowerCase().includes(value));
    index += 1;
  }

  if (sql.includes("ea.mime_type = $")) {
    const value = String(params[index] || "");
    filtered = filtered.filter((row) => String(row.mime_type) === value);
    index += 1;
  }

  if (sql.includes("ea.owner_id = $")) {
    const ownerId = Number(params[index]);
    filtered = filtered.filter((row) => Number(row.owner_id) === ownerId);
    index += 1;
  }

  if (sql.includes("ea.created_at::date >= $")) {
    const from = String(params[index] || "");
    filtered = filtered.filter((row) => String(row.created_at).slice(0, 10) >= from);
    index += 1;
  }

  if (sql.includes("ea.created_at::date <= $")) {
    const to = String(params[index] || "");
    filtered = filtered.filter((row) => String(row.created_at).slice(0, 10) <= to);
    index += 1;
  }

  return filtered;
}

function createAttachmentsDbDouble() {
  const usersById = new Map(USERS_FIXTURE.map((row) => [Number(row.id), clone(row)]));
  const eventsById = new Map(EVENTS_FIXTURE.map((row) => [Number(row.id), clone(row)]));
  const attachmentsById = new Map(ATTACHMENTS_FIXTURE.map((row) => [Number(row.id), clone(row)]));

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

    if (
      lower.includes("from event_attachments ea") &&
      lower.includes("join events e on e.id = ea.event_id") &&
      lower.includes("where ea.id = $1")
    ) {
      const attachmentId = Number(params[0]);
      const attachment = attachmentsById.get(attachmentId);
      if (!attachment) {
        return { rowCount: 0, rows: [] };
      }
      const event = eventsById.get(Number(attachment.event_id));
      return {
        rowCount: 1,
        rows: [
          {
            id: attachment.id,
            eventId: attachment.event_id,
            uploadedBy: attachment.uploaded_by,
            ownerId: attachment.owner_id,
            originalName: attachment.original_name,
            storedName: attachment.stored_name,
            mimeType: attachment.mime_type,
            sizeBytes: attachment.size_bytes,
            createdAt: attachment.created_at,
            encargadoId: event?.encargado_id || null
          }
        ]
      };
    }

    if (lower.startsWith("select count(*)::int as total from event_attachments ea")) {
      const rows = applyAttachmentFilters(sql, params, ATTACHMENTS_FIXTURE);
      return {
        rowCount: 1,
        rows: [{ total: rows.length }]
      };
    }

    if (
      lower.includes("select ea.id") &&
      lower.includes("from event_attachments ea") &&
      lower.includes("order by ea.created_at desc, ea.id desc")
    ) {
      const pageSize = Number(params[params.length - 2]);
      const offset = Number(params[params.length - 1]);
      const filterParams = params.slice(0, Math.max(0, params.length - 2));
      const filtered = applyAttachmentFilters(sql, filterParams, ATTACHMENTS_FIXTURE)
        .slice()
        .sort((left, right) => {
          const leftDate = new Date(left.created_at).getTime();
          const rightDate = new Date(right.created_at).getTime();
          if (leftDate !== rightDate) {
            return rightDate - leftDate;
          }
          return Number(right.id) - Number(left.id);
        });

      const usersByLookup = Object.fromEntries(
        USERS_FIXTURE.map((user) => [String(user.id), user])
      );

      const paginated = filtered.slice(offset, offset + pageSize).map((row) => {
        const owner = usersByLookup[String(row.owner_id)] || null;
        const uploader = usersByLookup[String(row.uploaded_by)] || null;
        const event = eventsById.get(Number(row.event_id)) || null;

        return {
          id: row.id,
          eventId: row.event_id,
          ownerId: row.owner_id,
          uploadedBy: row.uploaded_by,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          createdAt: row.created_at,
          eventDate: event?.fecha || null,
          ownerName: owner?.name || null,
          ownerEmail: owner?.email || null,
          uploadedByName: uploader?.name || null,
          uploadedByEmail: uploader?.email || null
        };
      });

      return {
        rowCount: paginated.length,
        rows: paginated
      };
    }

    if (lower.startsWith("insert into audit_logs")) {
      return { rowCount: 1, rows: [] };
    }

    throw new Error(`SQL no soportado por doble de adjuntos: ${sql}`);
  }

  return { query };
}

test("Adjuntos: preview seguro y repositorio operan sin regresion", async (t) => {
  const fakeDb = createAttachmentsDbDouble();
  const originalPoolQuery = pool.query.bind(pool);
  const app = createApp();
  const funcionario = USERS_FIXTURE.find((user) => user.role === "funcionario");
  const previewPath = path.resolve(config.uploadDir, "preview-test-501.pdf");

  pool.query = (...args) => fakeDb.query(...args);

  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  await fs.writeFile(
    previewPath,
    "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
    "utf8"
  );

  t.after(async () => {
    pool.query = originalPoolQuery;
    try {
      await fs.unlink(previewPath);
    } catch (_error) {
      // ignore cleanup errors
    }
  });

  await t.test("preview PDF responde inline con headers seguros para embedding controlado", async () => {
    const response = await attachSession(
      request(app).get("/events/attachments/501/preview"),
      funcionario,
      { includeCsrfHeader: false }
    );

    assert.equal(response.status, 200);
    assert.match(String(response.headers["content-type"] || ""), /^application\/pdf/);
    assert.match(String(response.headers["content-disposition"] || ""), /^inline; filename="/);
    assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
    assert.match(
      String(response.headers["content-security-policy"] || ""),
      /frame-ancestors 'self'/
    );
  });

  await t.test("preview bloquea tipos no soportados con 415", async () => {
    const response = await attachSession(
      request(app).get("/events/attachments/503/preview"),
      funcionario,
      { includeCsrfHeader: false }
    );

    assert.equal(response.status, 415);
    assert.equal(response.body.error, "preview_not_supported");
  });

  await t.test("repositorio de adjuntos devuelve vista paginada con permisos y relacion", async () => {
    const response = await attachSession(
      request(app).get("/events/attachments?page=1&pageSize=20"),
      funcionario,
      { includeCsrfHeader: false }
    );

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(response.body.items), true);
    assert.equal(response.body.pagination.total, 3);
    assert.equal(response.body.pagination.page, 1);

    const [first, second] = response.body.items;
    assert.equal(first.relationType, "bitacora");
    assert.match(String(first.relationLabel || ""), /^Bitacora #/);
    assert.equal(first.permissions.canView, true);
    assert.equal(first.permissions.canEdit, true);
    assert.equal(first.permissions.canDelete, true);

    assert.equal(second.permissions.canView, true);
    assert.equal(second.permissions.canEdit, false);
    assert.equal(second.permissions.canDelete, false);
  });

  await t.test("repositorio exige autenticacion", async () => {
    const response = await request(app).get("/events/attachments");
    assert.equal(response.status, 401);
    assert.equal(response.body.error, "unauthorized");
  });
});
