-- Up Migration

ALTER TABLE public.users
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Down Migration

ALTER TABLE public.users
DROP COLUMN updated_at;