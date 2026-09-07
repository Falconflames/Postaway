import AppError from "../errors/app.error.js";

/**
 * 403 Forbidden
 */

class ForbiddenError extends AppError {
  constructor(message = "Access denied.") {
    super(message, 403);
  }
}

export default ForbiddenError;