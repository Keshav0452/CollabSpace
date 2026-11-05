import type { Request, Response, NextFunction } from "express";

type Entry = { count: number; resetAt: number };

/** A small single-process limiter for sensitive authentication endpoints.
 * For multi-instance deployments, replace the in-memory store with Redis. */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const entries = new Map<string, Entry>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      entries.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ status: "error", message: options.message ?? "Too many requests. Please try again later." });
      return;
    }
    // Opportunistically remove expired keys to keep memory bounded.
    if (entries.size > 1000) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.resetAt <= now) entries.delete(storedKey);
      }
    }
    next();
  };
}
