
import { Router } from "express";
import { registerController } from "./auth.controller.js";
import { registerSchema } from "./auth.validation.js";
import { validateBody } from "../../middleware/validate.js";

const router = Router();

router.post("/register", validateBody(registerSchema),registerController,);

export default router;
