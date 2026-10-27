import { AppError } from "../../utils/app-error.js";
import {findWorkspaceForUser,findWorkspaceMember,} from "../workspaces/workspace.repository.js";
import {createTask as createTaskRecord,deleteTask as deleteTaskRecord,findTaskById,listTasks as listTaskRecords,updateTask as updateTaskRecord,} from "./task.repository.js";
import type { TaskRecord } from "./task.repository.js";
import type {CreateTaskInput,UpdateTaskInput,} from "./task.validation.js";

async function requireWorkspaceMembership(workspaceId: string,userId: string,): Promise<void> {
  const workspace = await findWorkspaceForUser(workspaceId, userId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }
}

async function requireWorkspaceAssignee(workspaceId: string,assignedTo: string | null | undefined,): Promise<void> {
  if (assignedTo == null) {
    return;
  }

  const member = await findWorkspaceMember(workspaceId, assignedTo);

  if (!member) {
    throw new AppError(
      400,
      "The assignee must be a member of this workspace",
    );
  }
}

export async function createTask(workspaceId: string,userId: string,input: CreateTaskInput,): Promise<TaskRecord> {
  await requireWorkspaceMembership(workspaceId, userId);

  await requireWorkspaceAssignee(workspaceId, input.assignedTo);

  return createTaskRecord(workspaceId, userId, input);
}

export async function getTasksForWorkspace(workspaceId: string, userId: string,): Promise<TaskRecord[]> {
  await requireWorkspaceMembership(workspaceId, userId);

  return listTaskRecords(workspaceId);
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

  if (input.assignedTo !== undefined) {
    await requireWorkspaceAssignee(workspaceId, input.assignedTo);
  }

  const updatedTask = await updateTaskRecord(
    workspaceId,
    taskId,
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
