import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Authentication successful",
    data: {
      userId: req.user!.id,
    },
  });
});

export default router;