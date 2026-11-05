-- Up Migration
-- Incrementing token_version immediately invalidates all previously issued
-- access tokens for an account (for example, after a password change).
ALTER TABLE public.users
  ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0
  CHECK (token_version >= 0);

-- Down Migration
ALTER TABLE public.users DROP COLUMN token_version;
