import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { removeWorkspaceMemberController,createWorkspaceController,listWorkspacesController,getWorkspaceController,renameWorkspaceController,addWorkspaceMemberController,listWorkspaceMembersController,updateWorkspaceMemberRoleController} from "./workspace.controller.js";
import { removeWorkspaceMemberSchema,createWorkspaceSchema,updateWorkspaceSchema,addWorkspaceMemberSchema,updateMemberRoleSchema } from "./workspace.validation.js";


const router = Router();

router.post("/",authenticate,validateBody(createWorkspaceSchema),createWorkspaceController,);
router.get("/", authenticate, listWorkspacesController);
router.get("/:workspaceId", authenticate, getWorkspaceController);
router.patch("/:workspaceId",authenticate,validateBody(updateWorkspaceSchema),renameWorkspaceController,);
router.post("/:workspaceId/members",authenticate,validateBody(addWorkspaceMemberSchema),addWorkspaceMemberController,);
router.get("/:workspaceId/members",authenticate,listWorkspaceMembersController,);
router.delete("/:workspaceId/members",authenticate,validateBody(removeWorkspaceMemberSchema), removeWorkspaceMemberController,);
router.patch("/:workspaceId/members/:userId/role",authenticate,validateBody(updateMemberRoleSchema),updateWorkspaceMemberRoleController,);

export default router;