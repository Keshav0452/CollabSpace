import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { createWorkspaceController,listWorkspacesController,getWorkspaceController,renameWorkspaceController } from "./workspace.controller.js";
import { createWorkspaceSchema,updateWorkspaceSchema } from "./workspace.validation.js";


const router = Router();

router.post("/",authenticate,validateBody(createWorkspaceSchema),createWorkspaceController,);
router.get("/", authenticate, listWorkspacesController);
router.get("/:workspaceId", authenticate, getWorkspaceController);
router.patch("/:workspaceId",authenticate,validateBody(updateWorkspaceSchema),renameWorkspaceController,);

export default router;