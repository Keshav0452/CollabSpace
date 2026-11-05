import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

interface HttpLikeError {
  type?: string;
  status?: number;
  statusCode?: number;
  code?: string;
}

function sendError(res: Parameters<ErrorRequestHandler>[2], status: number, message: string): void {
  res.status(status).json({ status: "error", message });
}

export const errorHandler: ErrorRequestHandler = ( error, _req, res,_next) => {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.message);

    return;
  }

  const httpError = (error ?? {}) as HttpLikeError;

  // Request body problems raised by express.json().
  if (httpError.type === "entity.too.large") {
    sendError(res, 413, "Request body is too large");
    return;
  }

  if (httpError.type === "entity.parse.failed" || httpError.type?.startsWith("encoding.")) {
    sendError(res, 400, "Request body is not valid JSON");
    return;
  }

  // PostgreSQL: a value (usually an id in the URL) is not a valid UUID.
  if (httpError.code === "22P02") {
    sendError(res, 400, "One of the supplied identifiers is not valid");
    return;
  }

  console.error("Unexpected error:", error);

  sendError(res, 500, "Internal server error");
};
