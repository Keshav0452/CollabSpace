CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    recipient_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    type TEXT NOT NULL
        CHECK (
            type IN (
                'task_assigned',
                'task_status_changed',
                'task_commented'
            )
        ),

    task_id UUID
        REFERENCES public.tasks(id)
        ON DELETE SET NULL,

    message TEXT NOT NULL
        CHECK (char_length(btrim(message)) BETWEEN 1 AND 500),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    read_at TIMESTAMPTZ,

    CONSTRAINT notifications_read_state_check
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR
            (is_read = TRUE AND read_at IS NOT NULL)
        )
);

CREATE INDEX notifications_recipient_created_idx
    ON public.notifications (
        recipient_id,
        created_at DESC,
        id DESC
    );

CREATE INDEX notifications_unread_idx
    ON public.notifications (recipient_id, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX notifications_actor_idx
    ON public.notifications (actor_id);