
import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = ( error, _req, res,_next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });

    return;
  }

  console.error("Unexpected error:", error);

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
