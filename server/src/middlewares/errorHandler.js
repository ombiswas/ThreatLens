import { AppError } from "../errors/AppError.js";
import { logger } from "../utils/logger.js";

/**
 * Global centralized error handling middleware.
 * Maps operational AppErrors to structured JSON shapes and suppresses internal stacks in production.
 */
export function errorHandler(err, req, res, next) {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Handle body-parser / JSON parse errors (e.g. malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Malformed JSON payload in request body"
      }
    });
  }

  // Handle payload too large errors
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request payload size exceeds maximum allowed limit"
      }
    });
  }

  // Handle Zod validation errors
  if (err.name === "ZodError" || (err.issues && Array.isArray(err.issues))) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      }
    });
  }

  // Handle operational AppErrors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // Log unhandled non-operational errors
  logger.error({
    msg: "Unhandled internal error",
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later."
    }
  });
}

/**
 * 404 handler for undefined API routes.
 */
export function notFoundHandler(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, "ROUTE_NOT_FOUND"));
}
