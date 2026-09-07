import AppError from "../errors/app.error.js";

/**
 * 409 Conflict
 */

class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(message, 409);
  }
}

export default ConflictError;