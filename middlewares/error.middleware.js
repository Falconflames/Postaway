// Config
import env from "../config/env.js";

// Utils
import logger from "../utils/logger.js";
import { setFlash } from "../utils/setflash.js";

// Errors
import AppError from "../errors/app.error.js";

/**
 * Global Express error-handling middleware.
 *
 * Handles operational and unexpected errors for both
 * browser and API requests.
 *
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export default function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;

  const message =
    statusCode >= 500 ? "Something went wrong. Please try again." : err.message;

  logger.error({
    name: err.name,
    status: statusCode,
    method: req.method,
    url: req.originalUrl,
    message: err.message || "Unknow error",
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });

  if (req.accepts("html")) {
    setFlash(res, "error", message);

    return res.redirect(req.get("Referrer") || "/signin");
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}
