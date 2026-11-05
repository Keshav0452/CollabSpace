import { apiRequest } from "./client";

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentResponse {
  success: true;
  data: TaskComment;
}

interface CommentsResponse {
  success: true;
  data: TaskComment[];
}

function commentsPath(workspaceId: string, taskId: string) {
  return `/workspaces/${workspaceId}/tasks/${taskId}/comments`;
}

export async function getComments(
  workspaceId: string,
  taskId: string,
): Promise<TaskComment[]> {
  const response = await apiRequest<CommentsResponse>(
    commentsPath(workspaceId, taskId),
  );

  return response.data;
}

export async function createComment(
  workspaceId: string,
  taskId: string,
  content: string,
): Promise<TaskComment> {
  const response = await apiRequest<CommentResponse>(
    commentsPath(workspaceId, taskId),
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );

  return response.data;
}

export async function updateComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
  content: string,
): Promise<TaskComment> {
  const response = await apiRequest<CommentResponse>(
    `${commentsPath(workspaceId, taskId)}/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
  );

  return response.data;
}

export async function deleteComment(
  workspaceId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  await apiRequest<unknown>(
    `${commentsPath(workspaceId, taskId)}/${commentId}`,
    { method: "DELETE" },
  );
}
