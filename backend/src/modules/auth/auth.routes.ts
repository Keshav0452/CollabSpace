
import { Router } from "express";
import { registerController,loginController } from "./auth.controller.js";
import { registerSchema,loginSchema } from "./auth.validation.js";
import { validateBody } from "../../middleware/validate.js";

const router = Router();

router.post("/register", validateBody(registerSchema),registerController,);
router.post("/login", validateBody(loginSchema),loginController,);

export default router;
