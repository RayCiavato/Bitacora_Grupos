const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { config } = require("./config");
const { logger } = require("./logger");
const { validatePasswordPolicy } = require("./services/passwordPolicy");
const { validateFullName } = require("./services/namePolicy");

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
        prioridad VARCHAR(20) NOT NULL DEFAULT 'media'
          CHECK (prioridad IN ('baja', 'media', 'alta', 'observacion')),
        encargado_id BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'sin_realizar'
          CHECK (status IN ('sin_realizar', 'en_proceso', 'pendiente_revision', 'completada', 'cancelada')),
        priority VARCHAR(20) NOT NULL DEFAULT 'media'
          CHECK (priority IN ('baja', 'media', 'alta')),
        start_date DATE,
        due_date DATE,
        created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
        assignee_ids BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[],
        allow_assignees_edit BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT tasks_due_after_start_check
          CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
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
      CREATE TABLE IF NOT EXISTS role_permission_policies (
        role user_role PRIMARY KEY,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(80) PRIMARY KEY,
        value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_key VARCHAR(160) NOT NULL,
        read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, notification_key)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS event_templates (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL UNIQUE,
        descripcion_base TEXT NOT NULL,
        observacion_base TEXT NOT NULL,
        prioridad_default VARCHAR(20) NOT NULL DEFAULT 'media'
          CHECK (prioridad_default IN ('baja', 'media', 'alta', 'observacion')),
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
        owner_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
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
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS assignee_ids BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[]
    `,
    `
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS allow_assignees_edit BOOLEAN NOT NULL DEFAULT FALSE
    `,
    `
      ALTER TABLE event_attachments
      ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE RESTRICT
    `,
    `
      UPDATE tasks
      SET assignee_ids = ARRAY[assigned_to]
      WHERE assigned_to IS NOT NULL
        AND (assignee_ids IS NULL OR cardinality(assignee_ids) = 0)
    `,
    `
      UPDATE event_attachments
      SET owner_id = uploaded_by
      WHERE owner_id IS NULL
    `,
    `
      ALTER TABLE event_attachments
      ALTER COLUMN owner_id SET NOT NULL
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'tasks_assignee_ids_no_nulls_check'
            AND conrelid = 'tasks'::regclass
        ) THEN
          ALTER TABLE tasks
          ADD CONSTRAINT tasks_assignee_ids_no_nulls_check
            CHECK (array_position(assignee_ids, NULL) IS NULL);
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'events_template_id_fkey'
            AND conrelid = 'events'::regclass
        ) THEN
          ALTER TABLE events
          ADD CONSTRAINT events_template_id_fkey
          FOREIGN KEY (template_id) REFERENCES event_templates(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `,
    `
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `,
    `
      ALTER TABLE events
      ALTER COLUMN prioridad TYPE VARCHAR(20)
    `,
    `
      ALTER TABLE event_templates
      ALTER COLUMN prioridad_default TYPE VARCHAR(20)
    `,
    `
      DO $$
      DECLARE constraint_name TEXT;
      BEGIN
        FOR constraint_name IN
          SELECT c.conname
          FROM pg_constraint c
          WHERE c.conrelid = 'events'::regclass
            AND c.contype = 'c'
            AND pg_get_constraintdef(c.oid) ILIKE '%prioridad%'
        LOOP
          EXECUTE format('ALTER TABLE events DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END LOOP;

        ALTER TABLE events
          ADD CONSTRAINT events_prioridad_check
          CHECK (prioridad IN ('baja', 'media', 'alta', 'observacion'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
    `
      DO $$
      DECLARE constraint_name TEXT;
      BEGIN
        FOR constraint_name IN
          SELECT c.conname
          FROM pg_constraint c
          WHERE c.conrelid = 'event_templates'::regclass
            AND c.contype = 'c'
            AND pg_get_constraintdef(c.oid) ILIKE '%prioridad_default%'
        LOOP
          EXECUTE format('ALTER TABLE event_templates DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END LOOP;

        ALTER TABLE event_templates
          ADD CONSTRAINT event_templates_prioridad_default_check
          CHECK (prioridad_default IN ('baja', 'media', 'alta', 'observacion'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_events_fecha ON events(fecha)",
    "CREATE INDEX IF NOT EXISTS idx_events_encargado ON events(encargado_id)",
    "CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids ON tasks USING GIN (assignee_ids)",
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_role_permission_policies_updated_at ON role_permission_policies(updated_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user_id ON user_notification_reads(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_user_notification_reads_read_at ON user_notification_reads(read_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id)",
    "CREATE INDEX IF NOT EXISTS idx_event_attachments_owner_id ON event_attachments(owner_id)",
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

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_set_updated_at'
        ) THEN
          CREATE TRIGGER tasks_set_updated_at
          BEFORE UPDATE ON tasks
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
  const nameResult = validateFullName(config.adminDefaultName);
  if (!nameResult.valid) {
    throw new Error(`ADMIN_DEFAULT_NAME no cumple politica: ${nameResult.errors.join(", ")}`);
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [config.adminDefaultEmail]
  );

  if (existing.rowCount > 0) {
    return;
  }

  const policyResult = validatePasswordPolicy(config.adminDefaultPassword, {
    email: config.adminDefaultEmail,
    name: nameResult.value
  });
  if (!policyResult.valid) {
    throw new Error(`ADMIN_DEFAULT_PASSWORD no cumple politica: ${policyResult.errors.join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(config.adminDefaultPassword, 12);

  const insertResult = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
    [nameResult.value, config.adminDefaultEmail, passwordHash]
  );

  if (insertResult.rowCount > 0) {
    logger.info({ email: config.adminDefaultEmail }, "Admin inicial creado");
  } else {
    logger.info({ email: config.adminDefaultEmail }, "Admin inicial ya existia");
  }
}

module.exports = { pool, ensureDatabaseSchema, ensureAdminUser };










