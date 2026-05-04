BEGIN;

CREATE TABLE IF NOT EXISTS event_correlations (
  id BIGSERIAL PRIMARY KEY,
  source_event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  target_event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  relation_type VARCHAR(32) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS source_event_id BIGINT REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS target_event_id BIGINT REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS relation_type VARCHAR(32) NOT NULL DEFAULT 'relacionado';

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE event_correlations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_correlations_not_self_check'
      AND conrelid = 'event_correlations'::regclass
  ) THEN
    ALTER TABLE event_correlations
      ADD CONSTRAINT event_correlations_not_self_check
      CHECK (source_event_id <> target_event_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_correlations_relation_type_check'
      AND conrelid = 'event_correlations'::regclass
  ) THEN
    ALTER TABLE event_correlations
      ADD CONSTRAINT event_correlations_relation_type_check
      CHECK (
        relation_type IN (
          'seguimiento',
          'reincidencia',
          'relacionado',
          'actualizacion',
          'causa_raiz',
          'evidencia',
          'otro'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_correlations_pair_type_active
  ON event_correlations (
    LEAST(source_event_id, target_event_id),
    GREATEST(source_event_id, target_event_id),
    relation_type
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_correlations_source_active
  ON event_correlations(source_event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_correlations_target_active
  ON event_correlations(target_event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_correlations_created_by
  ON event_correlations(created_by);

CREATE INDEX IF NOT EXISTS idx_event_correlations_created_at
  ON event_correlations(created_at DESC);

COMMIT;
