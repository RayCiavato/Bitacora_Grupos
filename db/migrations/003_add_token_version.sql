ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_token_version_check;

ALTER TABLE users
  ADD CONSTRAINT users_token_version_check CHECK (token_version >= 0);

