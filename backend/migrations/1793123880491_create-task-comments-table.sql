-- Up Migration

CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL
        REFERENCES public.tasks(id)
        ON DELETE CASCADE,

    author_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    content TEXT NOT NULL
        CHECK (
            char_length(btrim(content)) BETWEEN 1 AND 5000
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_comments_task_created_at_idx
    ON public.task_comments (task_id, created_at ASC, id ASC);

CREATE INDEX task_comments_author_id_idx
    ON public.task_comments (author_id);

CREATE TRIGGER set_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- Down Migration

DROP TABLE IF EXISTS public.task_comments;