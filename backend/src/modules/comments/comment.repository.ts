import { pool } from "../../config/database.js";
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.validation.js";

export interface CommentRecord {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentColumns = `
  id,
  task_id AS "taskId",
  author_id AS "authorId",
  content,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;


export async function createComment(
  taskId: string,
  authorId: string,
  input: CreateCommentInput,
): Promise<CommentRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Insert the comment.
    const commentResult = await client.query<CommentRecord>(
      `INSERT INTO public.task_comments (
         task_id,
         author_id,
         content
       )
       VALUES ($1, $2, $3)
       RETURNING ${commentColumns}`,
      [taskId, authorId, input.content],
    );

    const comment = commentResult.rows[0];

    if (!comment) {
      throw new Error("Comment creation returned no record");
    }

    // 2. Get task details needed for notifications and events.
    const taskResult = await client.query<{
      workspaceId: string;
      createdBy: string;
      assignedTo: string | null;
      title: string;
    }>(
      `SELECT
         workspace_id AS "workspaceId",
         created_by AS "createdBy",
         assigned_to AS "assignedTo",
         title
       FROM public.tasks
       WHERE id = $1`,
      [taskId],
    );

    const task = taskResult.rows[0];

    if (!task) {
      throw new Error("Task not found while creating comment");
    }

    // 3. Identify unique recipients, excluding the comment author.
    const recipientIds = new Set<string>();

    if (task.createdBy !== authorId) {
      recipientIds.add(task.createdBy);
    }

    if (task.assignedTo && task.assignedTo !== authorId) {
      recipientIds.add(task.assignedTo);
    }

    // 4. Create a notification and outbox event for each recipient.
    for (const recipientId of recipientIds) {
      const notificationMessage =
        `A new comment was added to the task "${task.title}".`;

      await client.query(
        `INSERT INTO public.notifications (
           recipient_id,
           actor_id,
           type,
           task_id,
           message
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          recipientId,
          authorId,
          "task_commented",
          taskId,
          notificationMessage,
        ],
      );

      // The outbox event will later be processed by a background worker.
      await client.query(
        `INSERT INTO public.outbox_events (
           event_type,
           payload
         )
         VALUES ($1, $2::jsonb)`,
        [
          "task.commented",
          JSON.stringify({
            taskId,
            workspaceId: task.workspaceId,
            commentId: comment.id,
            recipientId,
            actorId: authorId,
            notificationType: "task_commented",
          }),
        ],
      );
    }

    // 5. Commit the comment, notifications, and outbox events together.
    await client.query("COMMIT");

    return comment;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error if rollback also fails.
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function listComments(
  taskId: string,
): Promise<CommentRecord[]> {
  const result = await pool.query<CommentRecord>(
    `SELECT ${commentColumns}
     FROM public.task_comments
     WHERE task_id = $1
     ORDER BY created_at ASC, id ASC`,
    [taskId],
  );

  return result.rows;
}

export async function updateComment(
  taskId: string,
  commentId: string,
  authorId: string,
  input: UpdateCommentInput
): Promise<CommentRecord | null> {
  const result = await pool.query<CommentRecord>(
    `
      UPDATE public.task_comments
      SET content = $1
      WHERE task_id = $2
        AND id = $3
        AND author_id = $4
      RETURNING ${commentColumns}
    `,
    [input.content, taskId, commentId, authorId]
  );

  return result.rows[0] ?? null;
}

export async function deleteComment(
  taskId: string,
  commentId: string,
  authorId: string
): Promise<boolean> {
  const result = await pool.query(
    `
      DELETE FROM public.task_comments
      WHERE task_id = $1
        AND id = $2
        AND author_id = $3
    `,
    [taskId, commentId, authorId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}