CREATE TABLE public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type TEXT NOT NULL,

    payload JSONB NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'processed', 'failed')),

    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),

    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    processed_at TIMESTAMPTZ,

    last_error TEXT,

    CONSTRAINT outbox_processed_at_check
        CHECK (
            (status = 'processed' AND processed_at IS NOT NULL)
            OR
            (status <> 'processed' AND processed_at IS NULL)
        )
);

CREATE INDEX outbox_pending_events_idx
    ON public.outbox_events (available_at, created_at, id)
    WHERE status = 'pending';

CREATE INDEX outbox_processing_events_idx
    ON public.outbox_events (available_at, created_at, id)
    WHERE status = 'processing';