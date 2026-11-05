import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis.js";

const INCREMENT_AND_SET_TTL = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  local ttl = redis.call('PTTL', KEYS[1])
  return { current, ttl }
`;

/**
 * Shared Redis-backed fixed-window limiter. Since Redis is a required runtime
 * dependency for this application, fail closed if the limiter cannot run.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  scope?: string;
  message?: string;
}) {
  const scope = options.scope ?? "default";

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
      const ipHash = createHash("sha256").update(ip).digest("hex");
      const key = `collabspace:rate-limit:${scope}:${ipHash}`;
      const result = await redisClient.eval(INCREMENT_AND_SET_TTL, {
        keys: [key],
        arguments: [String(options.windowMs)],
      }) as [number, number];
      const [count, ttl] = result;

      if (count > options.max) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(ttl / 1000))));
        res.status(429).json({
          status: "error",
          message: options.message ?? "Too many requests. Please try again later.",
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limiter unavailable:", error);
      res.status(503).json({
        status: "error",
        message: "Service temporarily unavailable. Please try again.",
      });
    }
  };
}
