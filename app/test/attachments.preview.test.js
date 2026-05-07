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

const GROUPS_FIXTURE = Object.freeze([
  {
    id: 1,
    name: "General",
    slug: "general",
    description: "Grupo base para pruebas",
    is_system: true,
    is_active: true,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z"
  }
]);

const GROUP_POLICIES_FIXTURE = Object.freeze([
  {
    id: 1,
    source_group_id: 1,
    target_group_id: 1,
    resource_type: "all",
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
    can_export: true,
    can_administer: true,
    updated_at: "2026-04-01T00:00:00.000Z"
  }
]);

const ATTACHMENTS_FIXTURE = Object.freeze([
  {
    id: 501,
    event_id: 901,
    group_id: 1,
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
    group_id: 1,
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
    group_id: 1,
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
    group_id: 1,
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

  const groupScopeMatch = sql.match(/(?:ea|e)\.group_id\s*=\s*any\(\$(\d+)::bigint\[\]\)/i);
  if (groupScopeMatch) {
    const allowedGroupIds = Array.isArray(params[Number(groupScopeMatch[1]) - 1])
      ? params[Number(groupScopeMatch[1]) - 1].map(Number)
      : [];
    if (allowedGroupIds.length) {
      filtered = filtered.filter((row) => allowedGroupIds.includes(Number(row.group_id || 1)));
    }
  }

  const groupFilterMatch = sql.match(/(?:ea|e)\.group_id\s*=\s*\$(\d+)/i);
  if (groupFilterMatch) {
    const expected = Number(params[Number(groupFilterMatch[1]) - 1]);
    if (expected > 0) {
      filtered = filtered.filter((row) => Number(row.group_id || 1) === expected);
    }
  }

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
  const groups = clone(GROUPS_FIXTURE);
  const userGroups = USERS_FIXTURE.map((user) => ({
    user_id: Number(user.id),
    group_id: 1,
    role_in_group: user.role === "admin" ? "admin" : "member",
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z"
  }));
  const groupPolicies = clone(GROUP_POLICIES_FIXTURE);
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

    if (lower.startsWith("select id, name, slug, description, is_system, is_active, created_at, updated_at from groups")) {
      let rows = groups.slice();
      if (lower.includes("where is_active = true")) {
        rows = rows.filter((group) => Boolean(group.is_active));
      }
      return {
        rowCount: rows.length,
        rows: rows.map((group) => ({
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description,
          is_system: group.is_system,
          is_active: group.is_active,
          created_at: group.created_at,
          updated_at: group.updated_at
        }))
      };
    }

    if (lower.includes("from user_groups ug join groups g on g.id = ug.group_id")) {
      const userId = Number(params[0]);
      const rows = userGroups
        .filter((membership) => Number(membership.user_id) === userId)
        .map((membership) => {
          const group = groups.find((item) => Number(item.id) === Number(membership.group_id));
          if (!group || !group.is_active) {
            return null;
          }
          return {
            id: group.id,
            name: group.name,
            slug: group.slug,
            description: group.description,
            isSystem: group.is_system,
            isActive: group.is_active,
            roleInGroup: membership.role_in_group,
            createdAt: membership.created_at,
            updatedAt: membership.updated_at
          };
        })
        .filter(Boolean);
      return {
        rowCount: rows.length,
        rows
      };
    }

    if (lower.includes("from group_access_policies p")) {
      const resourceType = String(params[0] || "all");
      const rows = groupPolicies
        .filter((policy) => String(policy.resource_type) === resourceType)
        .map((policy) => ({
          source_group_id: policy.source_group_id,
          target_group_id: policy.target_group_id,
          resource_type: policy.resource_type,
          can_view: policy.can_view,
          can_create: policy.can_create,
          can_edit: policy.can_edit,
          can_delete: policy.can_delete,
          can_export: policy.can_export,
          can_administer: policy.can_administer
        }));
      return {
        rowCount: rows.length,
        rows
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
            encargadoId: event?.encargado_id || null,
            groupId: attachment.group_id || event?.group_id || 1,
            eventGroupId: event?.group_id || attachment.group_id || 1
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
          uploadedByEmail: uploader?.email || null,
          groupId: row.group_id || event?.group_id || 1,
          eventGroupId: event?.group_id || row.group_id || 1,
          groupName: "General",
          groupSlug: "general"
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
