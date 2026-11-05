import type { Request, Response, NextFunction } from "express";
import {
    ACCESS_TOKEN_TTL_SECONDS,
    createAccessToken,
    verifyAccessToken,
} from "../utils/token.js";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}

export async function authenticate( req: Request, res: Response, next: NextFunction,): Promise<void> {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            res.status(401).json({
                status: "error",
                message: "Authentication required",
            });
            return;
        }

        const token = authorization.slice("Bearer ".length).trim();

        if (!token) {
            res.status(401).json({
                status: "error",
                message: "Authentication required",
            });
            return;
        }

        const { userId, tokenVersion, expiresAt } = await verifyAccessToken(token);

        req.user = { id: userId };

        // Sliding session: once half the lifetime is gone, send a fresh token.
        const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);

        if (secondsLeft < ACCESS_TOKEN_TTL_SECONDS / 2) {
            res.setHeader("X-Access-Token", await createAccessToken(userId, tokenVersion));
        }

        next();
    } catch {
        res.status(401).json({
            status: "error",
            message: "Invalid or expired access token",
        });
    }
}