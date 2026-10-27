-- Up Migration

CREATE TABLE public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL
        REFERENCES public.tasks(id) ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.users(id) ON DELETE SET NULL,

    action TEXT NOT NULL
        CHECK (
            action IN (
                'created',
                'title_changed',
                'description_changed',
                'status_changed',
                'priority_changed',
                'assignee_changed',
                'due_date_changed'
            )
        ),

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_activity_task_created_at_idx
    ON public.task_activity (task_id, created_at DESC);

CREATE INDEX task_activity_actor_id_idx
    ON public.task_activity (actor_id);


-- Down Migration

DROP TABLE IF EXISTS public.task_activity;