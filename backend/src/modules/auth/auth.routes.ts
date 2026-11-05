
import { Router } from "express";
import { registerController,loginController } from "./auth.controller.js";
import { registerSchema,loginSchema } from "./auth.validation.js";
import { validateBody } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rate-limit.js";

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const router = Router();

router.post("/register", authRateLimit, validateBody(registerSchema),registerController,);
router.post("/login", authRateLimit, validateBody(loginSchema),loginController,);

export default router;
