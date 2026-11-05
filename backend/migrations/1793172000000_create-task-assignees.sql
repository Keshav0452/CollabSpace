-- Up Migration
-- Allow a task to be assigned to several workspace members.

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_workspace_id_id_unique UNIQUE (workspace_id, id);

CREATE TABLE public.task_assignees (
    task_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id),
    CONSTRAINT task_assignees_task_fk
        FOREIGN KEY (workspace_id, task_id)
        REFERENCES public.tasks (workspace_id, id)
        ON DELETE CASCADE,
    CONSTRAINT task_assignees_member_fk
        FOREIGN KEY (workspace_id, user_id)
        REFERENCES public.workspace_members (workspace_id, user_id)
        ON DELETE CASCADE
);

CREATE INDEX task_assignees_user_idx ON public.task_assignees (user_id);

-- Carry over existing single assignees.
INSERT INTO public.task_assignees (task_id, workspace_id, user_id)
SELECT id, workspace_id, assigned_to
FROM public.tasks
WHERE assigned_to IS NOT NULL;

-- Activity for assignee changes now stores arrays of user ids.
UPDATE public.task_activity
SET details = jsonb_build_object(
    'oldValue', CASE WHEN jsonb_typeof(details->'oldValue') = 'string'
                     THEN jsonb_build_array(details->'oldValue') ELSE '[]'::jsonb END,
    'newValue', CASE WHEN jsonb_typeof(details->'newValue') = 'string'
                     THEN jsonb_build_array(details->'newValue') ELSE '[]'::jsonb END
)
WHERE action = 'assignee_changed';

DROP INDEX IF EXISTS public.tasks_assigned_to_idx;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_assignee_workspace_member_fk;
ALTER TABLE public.tasks DROP COLUMN assigned_to;

-- Down Migration

ALTER TABLE public.tasks ADD COLUMN assigned_to UUID;

UPDATE public.tasks AS t
SET assigned_to = (
    SELECT a.user_id FROM public.task_assignees AS a
    WHERE a.task_id = t.id
    ORDER BY a.assigned_at, a.user_id
    LIMIT 1
);

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_assignee_workspace_member_fk
    FOREIGN KEY (workspace_id, assigned_to)
    REFERENCES public.workspace_members (workspace_id, user_id)
    ON DELETE SET NULL (assigned_to);
CREATE INDEX tasks_assigned_to_idx ON public.tasks (assigned_to);

UPDATE public.task_activity
SET details = jsonb_build_object(
    'oldValue', CASE WHEN jsonb_typeof(details->'oldValue') = 'array' THEN details->'oldValue'->0 ELSE 'null'::jsonb END,
    'newValue', CASE WHEN jsonb_typeof(details->'newValue') = 'array' THEN details->'newValue'->0 ELSE 'null'::jsonb END
)
WHERE action = 'assignee_changed';

DROP TABLE public.task_assignees;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_workspace_id_id_unique;
