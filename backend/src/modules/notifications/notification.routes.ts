import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateQuery } from "../../middleware/validate.js";
import { listNotificationsController, markAllNotificationsReadController, markNotificationReadController, unreadNotificationCountController } from "./notification.controller.js";
import { listNotificationsQuerySchema } from "./notification.validation.js";

const router = Router();

router.use(authenticate);
router.get("/", validateQuery(listNotificationsQuerySchema), listNotificationsController);
router.get("/unread-count", unreadNotificationCountController);
router.patch("/read-all", markAllNotificationsReadController);
router.patch("/:notificationId/read", markNotificationReadController);

export default router;