import type { Request, Response, NextFunction } from "express";
import { getTaskActivity } from "./task.service.js";

function getRouteParam(
  param: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }

  return param;
}

export async function getTaskActivityController(
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

    const activity = await getTaskActivity(
      workspaceId,
      taskId,
      userId,
    );

    res.status(200).json({
      status: "success",
      data: {
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
}