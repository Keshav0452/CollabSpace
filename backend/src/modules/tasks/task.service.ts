import { AppError } from "../../utils/app-error.js";
import {findWorkspaceForUser,findWorkspaceMember,} from "../workspaces/workspace.repository.js";
import {createTask as createTaskRecord,deleteTask as deleteTaskRecord,findTaskById,listTasks as listTaskRecords,updateTask as updateTaskRecord,} from "./task.repository.js";
import type { TaskRecord } from "./task.repository.js";
import type {CreateTaskInput,UpdateTaskInput,ListTasksQuery} from "./task.validation.js";
import { listTaskActivity } from "./task-activity.repository.js";
import { findProject } from "../projects/project.repository.js";

async function requireWorkspaceMembership(workspaceId: string,userId: string,): Promise<void> {
  const workspace = await findWorkspaceForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }
}

async function requireWorkspaceAssignees(workspaceId: string,assigneeIds: string[] | undefined,): Promise<void> {
  if (!assigneeIds || assigneeIds.length === 0) {
    return;
  }

  const members = await Promise.all(
    assigneeIds.map((id) => findWorkspaceMember(workspaceId, id)),
  );

  if (members.some((member) => !member)) {
    throw new AppError(
      400,
      "All assignees must be members of this workspace",
    );
  }
}

export async function createTask(workspaceId: string,userId: string,input: CreateTaskInput,): Promise<TaskRecord> {
  await requireWorkspaceMembership(workspaceId, userId);

  await requireWorkspaceAssignees(workspaceId, input.assigneeIds);
  if (input.projectId) {
    const project = await findProject(workspaceId, input.projectId);
    if (!project || project.status !== "active") throw new AppError(400, "Select an active project in this workspace");
  }

  return createTaskRecord(workspaceId, userId, input);
}

export async function getTasksForWorkspace(
  workspaceId: string,
  userId: string,
  filters: ListTasksQuery,
) {
  await requireWorkspaceMembership(workspaceId, userId);

  return listTaskRecords(workspaceId, filters);
}

export async function getTask(workspaceId: string,taskId: string,userId: string,): Promise<TaskRecord> {
  await requireWorkspaceMembership(workspaceId, userId);

  const task = await findTaskById(workspaceId, taskId);

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  return task;
}


export async function updateTask(
  workspaceId: string,
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  await requireWorkspaceMembership(workspaceId, userId);

  const existingTask = await findTaskById(workspaceId, taskId);

  if (!existingTask) {
    throw new AppError(404, "Task not found");
  }

  if (input.assigneeIds !== undefined) {
    await requireWorkspaceAssignees(workspaceId, input.assigneeIds);
  }
  if (input.projectId && input.projectId !== existingTask.projectId) {
    const project = await findProject(workspaceId, input.projectId);
    if (!project || project.status !== "active") throw new AppError(400, "Select an active project in this workspace");
  }

  const updatedTask = await updateTaskRecord(
    workspaceId,
    taskId,
    userId,
    input,
  );

  if (!updatedTask) {
    throw new AppError(404, "Task not found");
  }

  return updatedTask;
}

export async function deleteTask(
  workspaceId: string,
  taskId: string,
  userId: string,
): Promise<void> {
  await requireWorkspaceMembership(workspaceId, userId);

  const deleted = await deleteTaskRecord(workspaceId, taskId);

  if (!deleted) {
    throw new AppError(404, "Task not found");
  }
}

export async function getTaskActivity(
  workspaceId: string,
  taskId: string,
  userId: string,
) {
  // Verify workspace membership and confirm the task exists.
  await getTask(workspaceId, taskId, userId);

  // Return the task's activity history.
  return listTaskActivity(workspaceId,taskId);
}
