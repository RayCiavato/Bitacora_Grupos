ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_id VARCHAR(80) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

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
);

CREATE TABLE IF NOT EXISTS event_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  descripcion_base TEXT NOT NULL,
  observacion_base TEXT NOT NULL,
  prioridad_default VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridad_default IN ('baja', 'media', 'alta', 'observacion')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_templates
  ALTER COLUMN prioridad_default TYPE VARCHAR(20);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES event_templates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS event_attachments (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notification_reads (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key VARCHAR(160) NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user_id ON user_notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_read_at ON user_notification_reads(read_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'event_templates_set_updated_at'
  ) THEN
    CREATE TRIGGER event_templates_set_updated_at
    BEFORE UPDATE ON event_templates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

