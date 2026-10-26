import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token.js";

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

        const { userId } = await verifyAccessToken(token);

        req.user = { id: userId };

        next();
    } catch {
        res.status(401).json({
            status: "error",
            message: "Invalid or expired access token",
        });
    }
}