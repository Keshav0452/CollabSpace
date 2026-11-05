
import express from "express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { rateLimit } from "./middleware/rate-limit.js";
import protectedRouter from "./routes/protected.routes.js";
import workspaceRouter from "./modules/workspaces/workspace.routes.js";
import taskRouter from "./modules/tasks/task.routes.js";
import commentRouter from "./modules/comments/comment.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";
import projectRouter from "./modules/projects/project.routes.js";
import { inviteRouter, workspaceInviteRouter } from "./modules/invites/invite.routes.js";
const app = express();

app.disable("x-powered-by");
// How many reverse proxies sit in front of this server. This decides which
// address Express treats as the client's (req.ip), which the rate limiters use.
//   TRUST_PROXY=false or unset -> none (local development)
//   TRUST_PROXY=true           -> 1 proxy (e.g. only the bundled nginx)
//   TRUST_PROXY=2              -> 2 proxies (e.g. HTTPS proxy/CDN in front of nginx)
function parseTrustProxy(value: string | undefined): number | false {
  if (value === "true") return 1;
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
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

// Generous per-IP ceiling for the whole API; login/register and invite tokens
// have their own, much stricter limits.
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 600),
  scope: "api",
}));
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
