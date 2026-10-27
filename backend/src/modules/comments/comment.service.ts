import { AppError } from "../../utils/app-error.js";
import { findWorkspaceForUser,} from "../workspaces/workspace.repository.js";
import {findTaskById,} from "../tasks/task.repository.js";
import { createComment as createCommentRecord, deleteComment as deleteCommentRecord, listComments as listCommentRecords, updateComment as updateCommentRecord,} from "./comment.repository.js";
import type {CreateCommentInput,UpdateCommentInput,} from "./comment.validation.js";

async function requireTaskAccess(
  workspaceId: string,
  taskId: string,
  userId: string,
): Promise<void> {
  const workspace = await findWorkspaceForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  const task = await findTaskById(workspaceId, taskId);

  if (!task) {
    throw new AppError(404, "Task not found");
  }
}

export async function createComment(
  workspaceId: string,
  taskId: string,
  userId: string,
  input: CreateCommentInput,
) {
  await requireTaskAccess(workspaceId, taskId, userId);

  return createCommentRecord(taskId, userId, input);
}

export async function getComments(
  workspaceId: string,
  taskId: string,
  userId: string,
) {
  await requireTaskAccess(workspaceId, taskId, userId);

  return listCommentRecords(taskId);
}

export async function updateComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
  userId: string,
  input: UpdateCommentInput
) {
  await requireTaskAccess(workspaceId, taskId, userId);

  const existingComments = await listCommentRecords(taskId);
  const comment = existingComments.find(
    (item) => item.id === commentId
  );

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  if (comment.authorId !== userId) {
    throw new AppError(
      403,
      "You can only edit your own comments"
    );
  }

  const updatedComment = await updateCommentRecord(
    taskId,
    commentId,
    userId,
    input
  );

  if (!updatedComment) {
    throw new AppError(404, "Comment not found");
  }

  return updatedComment;
}

export async function deleteComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
  userId: string
): Promise<void> {
  await requireTaskAccess(workspaceId, taskId, userId);

  const existingComments = await listCommentRecords(taskId);
  const comment = existingComments.find(
    (item) => item.id === commentId
  );

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  if (comment.authorId !== userId) {
    throw new AppError(
      403,
      "You can only delete your own comments"
    );
  }

  const deleted = await deleteCommentRecord(
    taskId,
    commentId,
    userId
  );

  if (!deleted) {
    throw new AppError(404, "Comment not found");
  }
}