const crypto = require("crypto");
const { pool } = require("../db");
const { config } = require("../config");
const { hashToken } = require("./tokens");
const { normalizeEmail } = require("./emailPolicy");

function createInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function sanitizeInviteToken(value) {
  return String(value || "").trim();
}

function mapInviteRow(row) {
  return {
    id: Number(row.id),
    email: row.email,
    role: row.role,
    groupId: row.groupId ? Number(row.groupId) : null,
    groupName: row.groupName || null,
    groupSlug: row.groupSlug || null,
    invitedBy: row.invitedBy ? Number(row.invitedBy) : null,
    invitedByName: row.invitedByName || null,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt || null,
    revokedAt: row.revokedAt || null,
    createdAt: row.createdAt
  };
}

async function createUserInvite({ email, role = "funcionario", groupId, invitedBy }) {
  const token = createInviteToken();
  const tokenHash = hashToken(token);
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = new Date(Date.now() + Math.trunc(config.inviteTtlHours) * 60 * 60 * 1000);

  const result = await pool.query(
    `
      INSERT INTO user_invites (email, role, group_id, invited_by, token_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        email,
        role,
        group_id AS "groupId",
        invited_by AS "invitedBy",
        expires_at AS "expiresAt",
        accepted_at AS "acceptedAt",
        revoked_at AS "revokedAt",
        created_at AS "createdAt"
    `,
    [normalizedEmail, role, groupId, invitedBy || null, tokenHash, expiresAt.toISOString()]
  );

  return {
    invite: mapInviteRow(result.rows[0]),
    token
  };
}

async function listUserInvites() {
  const result = await pool.query(
    `
      SELECT
        i.id,
        i.email,
        i.role,
        i.group_id AS "groupId",
        g.name AS "groupName",
        g.slug AS "groupSlug",
        i.invited_by AS "invitedBy",
        inviter.name AS "invitedByName",
        i.expires_at AS "expiresAt",
        i.accepted_at AS "acceptedAt",
        i.revoked_at AS "revokedAt",
        i.created_at AS "createdAt"
      FROM user_invites i
      LEFT JOIN groups g ON g.id = i.group_id
      LEFT JOIN users inviter ON inviter.id = i.invited_by
      ORDER BY i.created_at DESC
      LIMIT 200
    `
  );
  return result.rows.map(mapInviteRow);
}

async function getValidInviteByToken(token) {
  const cleanToken = sanitizeInviteToken(token);
  if (!cleanToken || cleanToken.length > 256) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        i.id,
        i.email,
        i.role,
        i.group_id AS "groupId",
        g.name AS "groupName",
        g.slug AS "groupSlug",
        i.invited_by AS "invitedBy",
        inviter.name AS "invitedByName",
        i.expires_at AS "expiresAt",
        i.accepted_at AS "acceptedAt",
        i.revoked_at AS "revokedAt",
        i.created_at AS "createdAt"
      FROM user_invites i
      LEFT JOIN groups g ON g.id = i.group_id
      LEFT JOIN users inviter ON inviter.id = i.invited_by
      WHERE i.token_hash = $1
      LIMIT 1
    `,
    [hashToken(cleanToken)]
  );

  return result.rows[0] ? mapInviteRow(result.rows[0]) : null;
}

function getInviteFailureReason(invite) {
  if (!invite) {
    return "invite_not_found";
  }
  if (invite.revokedAt) {
    return "invite_revoked";
  }
  if (invite.acceptedAt) {
    return "invite_used";
  }
  if (new Date(invite.expiresAt) <= new Date()) {
    return "invite_expired";
  }
  return null;
}

async function markInviteAccepted(inviteId, client = pool) {
  await client.query(
    `
      UPDATE user_invites
      SET accepted_at = COALESCE(accepted_at, NOW())
      WHERE id = $1
    `,
    [inviteId]
  );
}

async function revokeInvite(inviteId) {
  const result = await pool.query(
    `
      UPDATE user_invites
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE id = $1
        AND accepted_at IS NULL
        AND revoked_at IS NULL
      RETURNING
        id,
        email,
        role,
        group_id AS "groupId",
        invited_by AS "invitedBy",
        expires_at AS "expiresAt",
        accepted_at AS "acceptedAt",
        revoked_at AS "revokedAt",
        created_at AS "createdAt"
    `,
    [inviteId]
  );
  return result.rows[0] ? mapInviteRow(result.rows[0]) : null;
}

module.exports = {
  createUserInvite,
  getInviteFailureReason,
  getValidInviteByToken,
  listUserInvites,
  markInviteAccepted,
  revokeInvite,
  sanitizeInviteToken
};
