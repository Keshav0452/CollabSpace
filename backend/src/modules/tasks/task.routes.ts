import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { createTaskController, deleteTaskController, getTaskController, listTasksController, updateTaskController } from "./task.controller.js";
import { createTaskSchema, updateTaskSchema } from "./task.validation.js";

const router = Router();

router.post("/:workspaceId/tasks", authenticate, validateBody(createTaskSchema), createTaskController);
router.get("/:workspaceId/tasks", authenticate, listTasksController);
router.get("/:workspaceId/tasks/:taskId", authenticate, getTaskController);
router.patch("/:workspaceId/tasks/:taskId", authenticate, validateBody(updateTaskSchema), updateTaskController);
router.delete("/:workspaceId/tasks/:taskId", authenticate, deleteTaskController);

export default router;
