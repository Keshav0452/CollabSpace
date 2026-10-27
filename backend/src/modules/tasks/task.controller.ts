
import type { Request, Response, NextFunction } from "express";
import {createTask,deleteTask,getTask,getTasksForWorkspace,updateTask,} from "./task.service.js";

function getRouteParam(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }

  return param;
}

export async function createTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const userId = req.user!.id;

    if (!workspaceId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID is required",
      });
      return;
    }

    const task = await createTask(
      workspaceId,
      userId,
      req.body,
    );

    res.status(201).json({
      status: "success",
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function listTasksController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const userId = req.user!.id;

    if (!workspaceId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID is required",
      });
      return;
    }

    const tasks = await getTasksForWorkspace(workspaceId, userId);

    res.status(200).json({
      status: "success",
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const userId = req.user!.id;

    if (!workspaceId || !taskId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID and task ID are required",
      });
      return;
    }

    const task = await getTask(workspaceId, taskId, userId);

    res.status(200).json({
      status: "success",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const userId = req.user!.id;

    if (!workspaceId || !taskId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID and task ID are required",
      });
      return;
    }

    const task = await updateTask(
      workspaceId,
      taskId,
      userId,
      req.body,
    );

    res.status(200).json({
      status: "success",
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const userId = req.user!.id;

    if (!workspaceId || !taskId) {
      res.status(400).json({
        status: "error",
        message: "Workspace ID and task ID are required",
      });
      return;
    }

    await deleteTask(workspaceId, taskId, userId);

    res.status(200).json({
      status: "success",
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
