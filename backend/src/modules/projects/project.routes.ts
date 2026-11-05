import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { createProjectController, deleteProjectController, listProjectsController, updateProjectController } from "./project.controller.js";
import { createProjectSchema, updateProjectSchema } from "./project.validation.js";

const router = Router();
router.use(authenticate);
router.get("/:workspaceId/projects", listProjectsController);
router.post("/:workspaceId/projects", validateBody(createProjectSchema), createProjectController);
router.patch("/:workspaceId/projects/:projectId", validateBody(updateProjectSchema), updateProjectController);
router.delete("/:workspaceId/projects/:projectId", deleteProjectController);
export default router;
