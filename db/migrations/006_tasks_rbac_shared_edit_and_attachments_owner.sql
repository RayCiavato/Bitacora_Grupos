-- RBAC avanzado para TASKS + ownership explicito en adjuntos

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assignee_ids BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS allow_assignees_edit BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tasks
SET assignee_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL
  AND (assignee_ids IS NULL OR cardinality(assignee_ids) = 0);

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

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids ON tasks USING GIN (assignee_ids);

ALTER TABLE event_attachments
  ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE RESTRICT;

UPDATE event_attachments
SET owner_id = uploaded_by
WHERE owner_id IS NULL;

ALTER TABLE event_attachments
  ALTER COLUMN owner_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_attachments_owner_id ON event_attachments(owner_id);
