DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_date'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'fecha'
  ) THEN
    ALTER TABLE events RENAME COLUMN event_date TO fecha;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'descripcion_actividad'
  ) THEN
    ALTER TABLE events RENAME COLUMN description TO descripcion_actividad;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'funcionario_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'encargado_id'
  ) THEN
    ALTER TABLE events RENAME COLUMN funcionario_id TO encargado_id;
  END IF;
END $$;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS observacion TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_type'
  ) THEN
    UPDATE events
    SET observacion = COALESCE(NULLIF(observacion, ''), event_type, 'Sin observacion');
    ALTER TABLE events DROP COLUMN event_type;
  END IF;

  UPDATE events
  SET observacion = COALESCE(NULLIF(observacion, ''), 'Sin observacion');
END $$;

ALTER TABLE events
  ALTER COLUMN observacion SET NOT NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS prioridad VARCHAR(10) NOT NULL DEFAULT 'media';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_prioridad_check'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_prioridad_check CHECK (prioridad IN ('baja', 'media', 'alta'));
  END IF;
END $$;

DROP INDEX IF EXISTS idx_events_event_date;
DROP INDEX IF EXISTS idx_events_funcionario;
CREATE INDEX IF NOT EXISTS idx_events_fecha ON events(fecha);
CREATE INDEX IF NOT EXISTS idx_events_encargado ON events(encargado_id);

DROP TRIGGER IF EXISTS events_prevent_funcionario_change ON events;
DROP TRIGGER IF EXISTS events_prevent_encargado_change ON events;

CREATE OR REPLACE FUNCTION prevent_encargado_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.encargado_id <> OLD.encargado_id THEN
    RAISE EXCEPTION 'encargado_id no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_prevent_encargado_change
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION prevent_encargado_change();

