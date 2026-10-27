import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { createCommentController, deleteCommentController, getCommentsController, updateCommentController } from "./comment.controller.js";
import { createCommentSchema, updateCommentSchema } from "./comment.validation.js";

const router = Router();

router.post("/:workspaceId/tasks/:taskId/comments", authenticate, validateBody(createCommentSchema), createCommentController);
router.get("/:workspaceId/tasks/:taskId/comments", authenticate, getCommentsController);
router.patch("/:workspaceId/tasks/:taskId/comments/:commentId", authenticate, validateBody(updateCommentSchema), updateCommentController);
router.delete("/:workspaceId/tasks/:taskId/comments/:commentId", authenticate, deleteCommentController);

export default router;