import { useState } from "react";
import type { FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { X } from "lucide-react";

import type { ApiTask, TaskActivity } from "../../../api/tasks.api";
import { getTaskActivity } from "../../../api/tasks.api";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "../../../api/comments.api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { useMembers } from "../../../hooks/useMembers";
import { PRIORITY_LABELS, STATUS_LABELS } from "../types";
import type { TaskPriority, TaskStatus } from "../types";

import "./TaskDetail.css";

interface TaskDetailProps {
  task: ApiTask;
  onClose: () => void;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function labelStatus(value: unknown): string {
  return STATUS_LABELS[value as TaskStatus] ?? String(value ?? "none");
}

function labelPriority(value: unknown): string {
  return PRIORITY_LABELS[value as TaskPriority] ?? String(value ?? "none");
}

function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { getMemberName, getMemberNames } = useMembers();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const workspaceId = activeWorkspace!.id;

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const commentsKey = ["task-comments", workspaceId, task.id];
  const activityKey = ["task-activity", workspaceId, task.id];

  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: () => getComments(workspaceId, task.id),
  });

  const activityQuery = useQuery({
    queryKey: activityKey,
    queryFn: () => getTaskActivity(workspaceId, task.id),
  });

  const addMutation = useMutation({
    mutationFn: (content: string) =>
      createComment(workspaceId, task.id, content),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateComment(workspaceId, task.id, id, content),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(workspaceId, task.id, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: commentsKey }),
    onError: (error: Error) => showToast(error.message, "error"),
  });

  function handleAddComment(event: FormEvent) {
    event.preventDefault();

    if (newComment.trim()) {
      addMutation.mutate(newComment.trim());
    }
  }

  function handleSaveEdit(event: FormEvent) {
    event.preventDefault();

    if (editingId && editingText.trim()) {
      editMutation.mutate({ id: editingId, content: editingText.trim() });
    }
  }

  // Older activity entries stored a single id (or null) instead of a list.
  function toIdList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value as string[];
    }

    return typeof value === "string" ? [value] : [];
  }

  function describeActivity(item: TaskActivity): string {
    const actor = item.actorId ? getMemberName(item.actorId) : "Someone";
    const { details } = item;

    switch (item.action) {
      case "created":
        return `${actor} created this task`;
      case "title_changed":
        return `${actor} renamed the task`;
      case "description_changed":
        return `${actor} updated the description`;
      case "status_changed":
        return `${actor} changed status from ${labelStatus(
          details.oldValue,
        )} to ${labelStatus(details.newValue)}`;
      case "priority_changed":
        return `${actor} changed priority from ${labelPriority(
          details.oldValue,
        )} to ${labelPriority(details.newValue)}`;
      case "assignee_changed":
        return `${actor} changed the assignees from ${getMemberNames(
          toIdList(details.oldValue),
        )} to ${getMemberNames(toIdList(details.newValue))}`;
      case "due_date_changed":
        return `${actor} changed the due date to ${
          details.newValue ? String(details.newValue).slice(0, 10) : "none"
        }`;
      case "project_changed":
        return `${actor} changed the project association`;
      default:
        return `${actor} updated the task`;
    }
  }

  const comments = commentsQuery.data ?? [];
  const activity = activityQuery.data ?? [];

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <aside
        className="task-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-detail-header">
          <h2 id="task-detail-title">{task.title}</h2>

          <button
            type="button"
            className="task-form-close"
            onClick={onClose}
            aria-label="Close task details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="task-detail-badges">
          <span className={`priority priority-${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`status-select status-${task.status}`}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        <p className="task-detail-description">
          {task.description || "No description provided."}
        </p>

        <dl className="task-detail-meta">
          <div>
            <dt>Assignees</dt>
            <dd>{getMemberNames(task.assigneeIds)}</dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>{getMemberName(task.createdBy)}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{task.dueDate ? task.dueDate.slice(0, 10) : "Not set"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>
        </dl>

        <section className="task-detail-section">
          <h3>Comments ({comments.length})</h3>

          {commentsQuery.isLoading && <p className="muted">Loading...</p>}
          {commentsQuery.isError && (
            <p className="task-form-error">Unable to load comments.</p>
          )}
          {!commentsQuery.isLoading &&
            !commentsQuery.isError &&
            comments.length === 0 && (
              <p className="muted">No comments yet.</p>
            )}

          <ul className="comment-list">
            {comments.map((comment) => {
              const isMine = comment.authorId === user?.id;
              const isEditing = editingId === comment.id;

              return (
                <li key={comment.id} className="comment">
                  <div className="comment-header">
                    <strong>{getMemberName(comment.authorId)}</strong>
                    <span>
                      {formatDateTime(comment.createdAt)}
                      {comment.updatedAt !== comment.createdAt &&
                        " (edited)"}
                    </span>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleSaveEdit}>
                      <textarea
                        value={editingText}
                        onChange={(event) =>
                          setEditingText(event.target.value)
                        }
                        rows={3}
                        maxLength={5000}
                        aria-label="Edit comment"
                      />
                      <div className="comment-actions">
                        <button
                          type="submit"
                          disabled={editMutation.isPending}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>{comment.content}</p>

                      {isMine && (
                        <div className="comment-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditingText(comment.content);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Delete this comment?")) {
                                deleteMutation.mutate(comment.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <form className="comment-form" onSubmit={handleAddComment}>
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Write a comment..."
              rows={3}
              maxLength={5000}
              aria-label="New comment"
            />
            <button
              type="submit"
              className="task-form-submit"
              disabled={addMutation.isPending || !newComment.trim()}
            >
              {addMutation.isPending ? "Posting..." : "Comment"}
            </button>
          </form>
        </section>

        <section className="task-detail-section">
          <h3>Activity</h3>

          {activityQuery.isLoading && <p className="muted">Loading...</p>}
          {activityQuery.isError && (
            <p className="task-form-error">Unable to load activity.</p>
          )}
          {!activityQuery.isLoading &&
            !activityQuery.isError &&
            activity.length === 0 && (
              <p className="muted">No activity yet.</p>
            )}

          <ul className="activity-list">
            {activity.map((item) => (
              <li key={item.id}>
                <span>{describeActivity(item)}</span>
                <time>{formatDateTime(item.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

export default TaskDetail;
