const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { config } = require("./config");
const { logger } = require("./logger");
const { validatePasswordPolicy } = require("./services/passwordPolicy");

const pool = new Pool({
  connectionString: config.databaseUrl
});

pool.on("error", (error) => {
  logger.error({ err: error }, "PostgreSQL pool error");
});

async function ensureDatabaseSchema() {
  const statements = [
    "CREATE EXTENSION IF NOT EXISTS citext",
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'funcionario');
        END IF;
      END $$;
    `,
    "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor'",
    `
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email CITEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'funcionario',
        token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0),
        failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
        lock_until TIMESTAMPTZ,
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_secret TEXT,
        mfa_temp_secret TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        descripcion_actividad TEXT NOT NULL,
        observacion TEXT NOT NULL,
        prioridad VARCHAR(10) NOT NULL DEFAULT 'media'
          CHECK (prioridad IN ('baja', 'media', 'alta')),
        encargado_id BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        token_id VARCHAR(80) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(80) NOT NULL,
        entity VARCHAR(80) NOT NULL,
        entity_id BIGINT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS event_templates (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL UNIQUE,
        descripcion_base TEXT NOT NULL,
        observacion_base TEXT NOT NULL,
        prioridad_default VARCHAR(10) NOT NULL DEFAULT 'media'
          CHECK (prioridad_default IN ('baja', 'media', 'alta')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS event_attachments (
        id BIGSERIAL PRIMARY KEY,
        event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES event_templates(id) ON DELETE SET NULL
    `,
    `
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `,
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_events_fecha ON events(fecha)",
    "CREATE INDEX IF NOT EXISTS idx_events_encargado ON events(encargado_id)",
    "CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id)",
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id)",
    `
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at'
        ) THEN
          CREATE TRIGGER users_set_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'events_set_updated_at'
        ) THEN
          CREATE TRIGGER events_set_updated_at
          BEFORE UPDATE ON events
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'event_templates_set_updated_at'
        ) THEN
          CREATE TRIGGER event_templates_set_updated_at
          BEFORE UPDATE ON event_templates
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;
    `,
    `
      CREATE OR REPLACE FUNCTION prevent_encargado_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.encargado_id <> OLD.encargado_id THEN
          RAISE EXCEPTION 'encargado_id no puede modificarse';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'events_prevent_encargado_change'
        ) THEN
          CREATE TRIGGER events_prevent_encargado_change
          BEFORE UPDATE ON events
          FOR EACH ROW
          EXECUTE FUNCTION prevent_encargado_change();
        END IF;
      END $$;
    `
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function ensureAdminUser() {
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [config.adminDefaultEmail]
  );

  if (existing.rowCount > 0) {
    return;
  }

  const policyResult = validatePasswordPolicy(config.adminDefaultPassword);
  if (!policyResult.valid) {
    throw new Error(`ADMIN_DEFAULT_PASSWORD no cumple politica: ${policyResult.errors.join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(config.adminDefaultPassword, 12);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [config.adminDefaultName, config.adminDefaultEmail, passwordHash]
  );

  logger.info({ email: config.adminDefaultEmail }, "Admin inicial creado");
}

module.exports = { pool, ensureDatabaseSchema, ensureAdminUser };
