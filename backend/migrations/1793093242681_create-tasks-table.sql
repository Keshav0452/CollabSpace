-- Up Migration

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id) ON DELETE CASCADE,

    title TEXT NOT NULL
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),

    description TEXT,

    status TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),

    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),

    assigned_to UUID,

    created_by UUID NOT NULL
        REFERENCES public.users(id) ON DELETE RESTRICT,

    due_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_assignee_workspace_member_fk
        FOREIGN KEY (workspace_id, assigned_to)
        REFERENCES public.workspace_members(workspace_id, user_id)
        ON DELETE SET NULL (assigned_to)
);

-- Indexes to speed up common task queries

CREATE INDEX tasks_workspace_created_at_idx
    ON public.tasks (workspace_id, created_at DESC);

CREATE INDEX tasks_workspace_status_idx
    ON public.tasks (workspace_id, status);

CREATE INDEX tasks_assigned_to_idx
    ON public.tasks (assigned_to);

-- Automatically update updated_at whenever a task changes

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- Down Migration

DROP TABLE IF EXISTS public.tasks;