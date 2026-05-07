BEGIN;

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_groups (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  role_in_group VARCHAR(80) NOT NULL DEFAULT 'miembro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS group_access_policies (
  id BIGSERIAL PRIMARY KEY,
  source_group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  target_group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  resource_type VARCHAR(80) NOT NULL DEFAULT 'all',
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_export BOOLEAN NOT NULL DEFAULT FALSE,
  can_administer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_group_id, target_group_id, resource_type)
);

INSERT INTO groups (name, slug, description, is_system)
VALUES
  ('General', 'general', 'Grupo seguro para datos historicos y usuarios existentes.', TRUE),
  ('Soporte', 'soporte', 'Area interna de soporte operativo.', TRUE),
  ('Infraestructura', 'infraestructura', 'Area interna de infraestructura.', TRUE),
  ('Seguridad Tecnologica', 'seguridad-tecnologica', 'Area transversal de seguridad tecnologica.', TRUE),
  ('Gerencia', 'gerencia', 'Grupo gerencial con visibilidad configurable.', TRUE)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id BIGINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id BIGINT;
ALTER TABLE event_attachments ADD COLUMN IF NOT EXISTS group_id BIGINT;

UPDATE events
SET group_id = (SELECT id FROM groups WHERE slug = 'general' LIMIT 1)
WHERE group_id IS NULL;

UPDATE tasks
SET group_id = (SELECT id FROM groups WHERE slug = 'general' LIMIT 1)
WHERE group_id IS NULL;

UPDATE event_attachments ea
SET group_id = COALESCE(
  (SELECT e.group_id FROM events e WHERE e.id = ea.event_id),
  (SELECT id FROM groups WHERE slug = 'general' LIMIT 1)
)
WHERE ea.group_id IS NULL;

INSERT INTO user_groups (user_id, group_id, role_in_group)
SELECT u.id, g.id, 'miembro'
FROM users u
CROSS JOIN groups g
WHERE g.slug = 'general'
ON CONFLICT (user_id, group_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_group_id_fkey'
      AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_group_id_fkey'
      AND conrelid = 'tasks'::regclass
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_attachments_group_id_fkey'
      AND conrelid = 'event_attachments'::regclass
  ) THEN
    ALTER TABLE event_attachments
      ADD CONSTRAINT event_attachments_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE events ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE event_attachments ALTER COLUMN group_id SET NOT NULL;

INSERT INTO group_access_policies (
  source_group_id,
  target_group_id,
  resource_type,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_administer
)
SELECT g.id, g.id, 'all', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE
FROM groups g
ON CONFLICT (source_group_id, target_group_id, resource_type) DO NOTHING;

INSERT INTO group_access_policies (
  source_group_id,
  target_group_id,
  resource_type,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_administer
)
SELECT source.id, target.id, 'all', TRUE, FALSE, FALSE, FALSE, TRUE, FALSE
FROM groups source
CROSS JOIN groups target
WHERE source.slug = 'seguridad-tecnologica'
  AND target.slug IN ('soporte', 'infraestructura')
ON CONFLICT (source_group_id, target_group_id, resource_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_groups_active_slug ON groups(is_active, slug);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_group_access_source ON group_access_policies(source_group_id);
CREATE INDEX IF NOT EXISTS idx_group_access_target ON group_access_policies(target_group_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_group_id ON event_attachments(group_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'groups_set_updated_at') THEN
    CREATE TRIGGER groups_set_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_groups_set_updated_at') THEN
    CREATE TRIGGER user_groups_set_updated_at
    BEFORE UPDATE ON user_groups
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'group_access_policies_set_updated_at') THEN
    CREATE TRIGGER group_access_policies_set_updated_at
    BEFORE UPDATE ON group_access_policies
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

COMMIT;
