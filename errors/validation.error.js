import AppError from "../errors/app.error.js";

/**
 * 400 Bad Request
 */

class ValidationError extends AppError {
  constructor(message = "Validation failed.") {
    super(message, 400);
  }
}

export default ValidationError;