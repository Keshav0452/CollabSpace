
import { apiRequest } from "./client";
import type {
  TaskStatus,
  TaskPriority,
} from "../features/tasks/types";

// Represents a task returned by our backend.
export interface ApiTask {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  createdBy: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backend pagination structure.
export interface PaginatedTasks {
  tasks: ApiTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filters supported by the backend.
export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  projectId?: string;
  search?: string;
}

// Data required to create a task.
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  projectId?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
}

// Fields that can be updated.
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
}

// API response types.
interface TaskListResponse {
  status: "success";
  data: {
    result: PaginatedTasks;
  };
}

interface TaskResponse {
  status: "success";
  data: {
    task: ApiTask;
  };
}

// Fetch tasks belonging to a workspace.
export async function getTasks(
  workspaceId: string,
  filters: TaskFilters = {},
): Promise<PaginatedTasks> {
  const queryParams = new URLSearchParams();

  if (filters.page !== undefined) {
    queryParams.set("page", String(filters.page));
  }

  if (filters.limit !== undefined) {
    queryParams.set("limit", String(filters.limit));
  }

  if (filters.status) {
    queryParams.set("status", filters.status);
  }

  if (filters.priority) {
    queryParams.set("priority", filters.priority);
  }

  if (filters.assignedTo) {
    queryParams.set("assignedTo", filters.assignedTo);
  }
  if (filters.projectId) queryParams.set("projectId", filters.projectId);
  if (filters.search) queryParams.set("search", filters.search);

  const queryString = queryParams.toString();
  const endpoint = `/workspaces/${workspaceId}/tasks${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await apiRequest<TaskListResponse>(endpoint);

  return response.data.result;
}

// Fetch one task, including when opened from a notification deep link.
export async function getTask(workspaceId: string, taskId: string): Promise<ApiTask> {
  const response = await apiRequest<TaskResponse>(`/workspaces/${workspaceId}/tasks/${taskId}`);
  return response.data.task;
}

// Create a task inside a workspace.
export async function createTask(
  workspaceId: string,
  input: CreateTaskInput,
): Promise<ApiTask> {
  const response = await apiRequest<TaskResponse>(
    `/workspaces/${workspaceId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data.task;
}

// Update an existing task.
export async function updateTask(
  workspaceId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<ApiTask> {
  const response = await apiRequest<TaskResponse>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data.task;
}

// Delete a task.
export async function deleteTask(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  await apiRequest<unknown>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    {
      method: "DELETE",
    },
  );
}

export type TaskActivityAction =
  | "created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "due_date_changed"
  | "project_changed";

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string | null;
  action: TaskActivityAction;
  details: Record<string, unknown>;
  createdAt: string;
}

interface TaskActivityResponse {
  status: "success";
  data: {
    activity: TaskActivity[];
  };
}

// Fetch the change history of a task.
export async function getTaskActivity(
  workspaceId: string,
  taskId: string,
): Promise<TaskActivity[]> {
  const response = await apiRequest<TaskActivityResponse>(
    `/workspaces/${workspaceId}/tasks/${taskId}/activity`,
  );

  return response.data.activity;
}
