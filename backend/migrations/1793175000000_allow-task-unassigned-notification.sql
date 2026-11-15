-- Up Migration
-- Allow a notification when someone is removed from a task.

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned',
        'task_unassigned',
        'task_status_changed',
        'task_commented'
    ));

-- Down Migration

DELETE FROM public.notifications WHERE type = 'task_unassigned';
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'task_assigned',
        'task_status_changed',
        'task_commented'
    ));
