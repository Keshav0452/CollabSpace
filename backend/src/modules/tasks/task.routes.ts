import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody,validateQuery,} from "../../middleware/validate.js";
import { createTaskController, deleteTaskController, getTaskController, listTasksController, updateTaskController } from "./task.controller.js";
import { createTaskSchema, updateTaskSchema,listTasksQuerySchema, } from "./task.validation.js";
import { getTaskActivityController } from "./task-activity.controller.js";

const router = Router();

router.post("/:workspaceId/tasks", authenticate, validateBody(createTaskSchema), createTaskController);
router.get("/:workspaceId/tasks", authenticate,validateQuery(listTasksQuerySchema),listTasksController);
router.get("/:workspaceId/tasks/:taskId", authenticate, getTaskController);
router.patch("/:workspaceId/tasks/:taskId", authenticate, validateBody(updateTaskSchema), updateTaskController);
router.delete("/:workspaceId/tasks/:taskId", authenticate, deleteTaskController);
router.get("/:workspaceId/tasks/:taskId/activity",authenticate,getTaskActivityController,);


export default router;
