import type { NextFunction, Request, Response } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service.js";
import type { ListNotificationsQuery } from "./notification.validation.js";

export async function listNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = res.locals.validatedQuery as ListNotificationsQuery;

    const result = await getNotifications(userId, query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function unreadNotificationCountController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const unreadCount = await getUnreadNotificationCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.notificationId;

    if (typeof notificationId !== "string") {
      res.status(400).json({
        success: false,
        message: "A valid notification ID is required",
      });
      return;
    }

    const notification = await markNotificationRead(
      userId,
      notificationId
    );

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsReadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await markAllNotificationsRead(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}