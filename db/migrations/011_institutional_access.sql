-- 011_institutional_access.sql
-- Actualizacion incremental: invitaciones, estados de cuenta y recovery codes MFA.
-- No borra datos existentes ni recrea tablas.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(24) NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_invites (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'funcionario',
  group_id BIGINT REFERENCES groups(id) ON DELETE RESTRICT,
  invited_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON user_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invites_state ON user_invites(accepted_at, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_mfa_recovery_codes_user_unused
  ON user_mfa_recovery_codes(user_id)
  WHERE used_at IS NULL;
