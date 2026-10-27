
import express from "express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import protectedRouter from "./routes/protected.routes.js";
import workspaceRouter from "./modules/workspaces/workspace.routes.js";

const app = express();

app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/protected", protectedRouter);
app.use("/api/workspaces", workspaceRouter);

// Error-handling middleware must come after the routes.
app.use(errorHandler);

export default app;
