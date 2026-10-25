-- Up Migration

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- Down Migration

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
DROP FUNCTION IF EXISTS public.set_updated_at();