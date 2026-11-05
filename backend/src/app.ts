
import express from "express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import protectedRouter from "./routes/protected.routes.js";
import workspaceRouter from "./modules/workspaces/workspace.routes.js";
import taskRouter from "./modules/tasks/task.routes.js";
import commentRouter from "./modules/comments/comment.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";
import projectRouter from "./modules/projects/project.routes.js";
import { inviteRouter, workspaceInviteRouter } from "./modules/invites/invite.routes.js";
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
});
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/protected", protectedRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/workspaces", taskRouter);
app.use("/api/workspaces", commentRouter);
app.use("/api/workspaces", projectRouter);
app.use("/api/workspaces", workspaceInviteRouter);
app.use("/api/invites", inviteRouter);
app.use("/api/notifications", notificationRouter);

// Error-handling middleware must come after the routes.
app.use(errorHandler);

export default app;
