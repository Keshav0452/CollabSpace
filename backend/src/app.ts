
import express from "express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import protectedRouter from "./routes/protected.routes.js";
import workspaceRouter from "./modules/workspaces/workspace.routes.js";
import taskRouter from "./modules/tasks/task.routes.js";
import commentRouter from "./modules/comments/comment.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";
const app = express();

app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/protected", protectedRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/workspaces", taskRouter);
app.use("/api/workspaces", commentRouter);
app.use("/api/notifications", notificationRouter);

// Error-handling middleware must come after the routes.
app.use(errorHandler);

export default app;
