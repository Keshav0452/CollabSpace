import express from "express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";

const app = express();

// Parse incoming JSON request bodies.
app.use(express.json());

// Register the health-check routes.
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

export default app;