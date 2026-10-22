import express from "express";
import healthRouter from "./routes/health.routes.js";

const app = express();

// Parse incoming JSON request bodies.
app.use(express.json());

// Register the health-check routes.
app.use("/api/health", healthRouter);

export default app;