import { Router } from "express";
import { pool } from "../config/database.js";
import { redisClient } from "../config/redis.js";

const router = Router();

// Liveness: the process is up. Used by the container health check.
router.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "CollabSpace API is healthy",
  });
});

// Readiness: dependencies answer. Point an uptime monitor at this one.
router.get("/ready", async (_req, res) => {
  const checks = { database: false, redis: false };

  try {
    await pool.query("SELECT 1");
    checks.database = true;
  } catch {
    // Reported below.
  }

  try {
    checks.redis = redisClient.isReady && (await redisClient.ping()) === "PONG";
  } catch {
    // Reported below.
  }

  const ready = checks.database && checks.redis;

  res.status(ready ? 200 : 503).json({
    status: ready ? "success" : "error",
    checks,
  });
});

export default router;
