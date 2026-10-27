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
  const result = await pool.query<CommentRecord>(
    `INSERT INTO public.task_comments (
       task_id,
       author_id,
       content
     )
     VALUES ($1, $2, $3)
     RETURNING ${commentColumns}`,
    [taskId, authorId, input.content],
  );

  return result.rows[0];
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