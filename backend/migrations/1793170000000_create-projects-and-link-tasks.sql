-- Up Migration

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
    description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT projects_workspace_id_id_unique UNIQUE (workspace_id, id)
);

CREATE UNIQUE INDEX projects_workspace_name_unique_idx
    ON public.projects (workspace_id, lower(name));
CREATE INDEX projects_workspace_status_created_idx
    ON public.projects (workspace_id, status, created_at DESC);

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ADD COLUMN project_id UUID;
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_project_workspace_fk
    FOREIGN KEY (workspace_id, project_id)
    REFERENCES public.projects (workspace_id, id)
    ON DELETE SET NULL (project_id);
CREATE INDEX tasks_workspace_project_idx
    ON public.tasks (workspace_id, project_id, created_at DESC);

ALTER TABLE public.task_activity DROP CONSTRAINT task_activity_action_check;
ALTER TABLE public.task_activity
    ADD CONSTRAINT task_activity_action_check
    CHECK (action IN (
        'created', 'title_changed', 'description_changed', 'status_changed',
        'priority_changed', 'assignee_changed', 'due_date_changed', 'project_changed'
    ));

-- Down Migration

DELETE FROM public.task_activity WHERE action = 'project_changed';
ALTER TABLE public.task_activity DROP CONSTRAINT IF EXISTS task_activity_action_check;
ALTER TABLE public.task_activity
    ADD CONSTRAINT task_activity_action_check
    CHECK (action IN (
        'created', 'title_changed', 'description_changed', 'status_changed',
        'priority_changed', 'assignee_changed', 'due_date_changed'
    ));
DROP INDEX IF EXISTS public.tasks_workspace_project_idx;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_workspace_fk;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS project_id;
DROP TABLE IF EXISTS public.projects;
