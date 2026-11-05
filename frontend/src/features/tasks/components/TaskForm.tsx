import { useState } from "react";
import type { FormEvent } from "react";

import type { ApiTask } from "../../../api/tasks.api";
import type { WorkspaceMember } from "../../../api/members.api";
import type { Project } from "../../../api/projects.api";
import type { TaskPriority, TaskStatus } from "../types";

import "./TaskForm.css";

export interface TaskFormValues {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string | null;
  dueDate: string | null;
  projectId: string | null;
}

interface TaskFormProps {
  members: WorkspaceMember[];
  projects: Project[];
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  initialTask?: ApiTask;
}

function TaskForm({
  members,
  projects,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage = null,
  initialTask,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(
    initialTask?.description ?? "",
  );
  const [priority, setPriority] = useState<TaskPriority>(
    initialTask?.priority ?? "medium",
  );
  const [status, setStatus] = useState<TaskStatus>(
    initialTask?.status ?? "todo",
  );
  const [assignedTo, setAssignedTo] = useState(
    initialTask?.assignedTo ?? "",
  );
  const [projectId, setProjectId] = useState(initialTask?.projectId ?? "");
  // The date input works with YYYY-MM-DD; the API stores a full timestamp.
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate?.slice(0, 10) ?? "",
  );

  const isEditing = Boolean(initialTask);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      projectId: projectId || null,
    });
  }

  return (
    <div className="task-form-overlay">
      <section
        className="task-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <div className="task-form-heading">
          <div>
            <h2 id="task-form-title">
              {isEditing ? "Edit Task" : "Create New Task"}
            </h2>
            <p>
              {isEditing
                ? "Update the details of your task."
                : "Add a task to your workspace."}
            </p>
          </div>

          <button
            type="button"
            className="task-form-close"
            onClick={onCancel}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="task-form-field">
            <label htmlFor="task-title">Task title *</label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Implement login page"
              required
              maxLength={200}
            />
          </div>

          <div className="task-form-field">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what needs to be done..."
              rows={3}
              maxLength={5000}
            />
          </div>

          <div className="task-form-field">
            <label htmlFor="task-project">Project</label>
            <select id="task-project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">No project</option>
              {projects.filter((project) => project.status === "active" || project.id === initialTask?.projectId).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="task-form-row">
            <div className="task-form-field">
              <label htmlFor="task-assignee">Assignee</label>
              <select
                id="task-assignee"
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          <div className="task-form-row">
            <div className="task-form-field">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* New tasks always start as "To Do" on the backend. */}
            {isEditing && (
              <div className="task-form-field">
                <label htmlFor="task-status">Status</label>
                <select
                  id="task-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
                  }
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="task-form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="task-form-actions">
            <button
              type="button"
              className="task-form-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="task-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default TaskForm;
