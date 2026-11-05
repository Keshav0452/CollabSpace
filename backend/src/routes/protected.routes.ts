import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.js";
import { changeAccountPassword, getAccountProfile, updateAccountProfile } from "../modules/auth/account.service.js";
import { changePasswordSchema, updateProfileSchema } from "../modules/auth/auth.validation.js";

const router = Router();
router.use(authenticate);

router.get("/me", async (req, res, next) => {
  try {
    const user = await getAccountProfile(req.user!.id);
    res.status(200).json({ status: "success", message: "Authentication successful", data: { user } });
  } catch (error) { next(error); }
});

router.patch("/me", validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await updateAccountProfile(req.user!.id, req.body);
    res.status(200).json({ status: "success", message: "Profile updated successfully", data: { user } });
  } catch (error) { next(error); }
});

router.patch("/me/password", validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    await changeAccountPassword(req.user!.id, req.body);
    res.status(200).json({ status: "success", message: "Password changed successfully" });
  } catch (error) { next(error); }
});

export default router;
