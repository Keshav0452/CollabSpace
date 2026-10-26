import type { Request, Response } from "express";

export function registerController(_req: Request,res: Response,): void {
  res.status(501).json({
    status: "error",
    message: "Registration is not implemented yet",
  });
}