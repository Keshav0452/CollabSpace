import { CalendarDays, Pencil, Trash2 } from "lucide-react";

import type { ApiTask } from "../../../api/tasks.api";
import type { TaskStatus } from "../types";

interface TaskListProps {
  tasks: ApiTask[];
  getMemberNames: (userIds: string[]) => string;
  getProjectName: (projectId: string | null) => string;
  onOpen: (task: ApiTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (task: ApiTask) => void;
}

function TaskList({
  tasks,
  getMemberNames,
  getProjectName,
  onOpen,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-tasks">
        <h3>No tasks found</h3>
        <p>There are no tasks matching this filter.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className="task-card" key={task.id}>
          <div className="task-card-main">
            <div className="task-card-title">
              <button
                type="button"
                className={`task-checkbox ${
                  task.status === "done" ? "task-checkbox-checked" : ""
                }`}
                onClick={() =>
                  onStatusChange(
                    task.id,
                    task.status === "done" ? "todo" : "done",
                  )
                }
                aria-label={
                  task.status === "done"
                    ? `Mark ${task.title} incomplete`
                    : `Mark ${task.title} completed`
                }
                aria-pressed={task.status === "done"}
              >
                {task.status === "done" ? "✓" : ""}
              </button>

              <h3
                className={
                  task.status === "done" ? "completed-task-title" : ""
                }
              >
                <button
                  type="button"
                  className="task-title-button"
                  onClick={() => onOpen(task)}
                >
                  {task.title}
                </button>
              </h3>
            </div>

            {task.description && (
              <p className="task-description">{task.description}</p>
            )}

            <div className="task-card-meta">
              {task.projectId && <span className="task-project-label">{getProjectName(task.projectId)}</span>}
              {task.dueDate && (
                <span className="task-due-date">
                  <CalendarDays size={14} />
                  {task.dueDate.slice(0, 10)}
                </span>
              )}
            </div>
          </div>

          <div className="task-card-side">
            <span className={`priority priority-${task.priority}`}>
              {task.priority}
            </span>

            <select
              className={`status-select status-${task.status}`}
              value={task.status}
              onChange={(event) =>
                onStatusChange(task.id, event.target.value as TaskStatus)
              }
              aria-label={`Change status for ${task.title}`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>

            <span className="task-assignee">
              {getMemberNames(task.assigneeIds)}
            </span>

            <button
              type="button"
              className="task-edit-button"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}`}
            >
              <Pencil size={14} />
              Edit
            </button>

            <button
              type="button"
              className="task-delete-button"
              onClick={() => onDelete(task)}
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default TaskList;
