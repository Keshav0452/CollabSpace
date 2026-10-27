import type { Request, Response, NextFunction } from "express";

import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "./comment.service.js";

import type {
  CreateCommentInput,
  UpdateCommentInput,
} from "./comment.validation.js";

function getRouteParam(
  param: string | string[] | undefined
): string {
  if (typeof param !== "string") {
    throw new Error("Invalid route parameter");
  }

  return param;
}

export async function createCommentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const userId = req.user!.id;

    const input = req.body as CreateCommentInput;

    const comment = await createComment(
      workspaceId,
      taskId,
      userId,
      input
    );

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCommentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const userId = req.user!.id;

    const comments = await getComments(
      workspaceId,
      taskId,
      userId
    );

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCommentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const commentId = getRouteParam(req.params.commentId);
    const userId = req.user!.id;

    const input = req.body as UpdateCommentInput;

    const comment = await updateComment(
      workspaceId,
      taskId,
      commentId,
      userId,
      input
    );

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCommentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = getRouteParam(req.params.workspaceId);
    const taskId = getRouteParam(req.params.taskId);
    const commentId = getRouteParam(req.params.commentId);
    const userId = req.user!.id;

    await deleteComment(
      workspaceId,
      taskId,
      commentId,
      userId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}