import AppError from "../errors/app.error.js";

/**
 * 404 Not Found
 */

class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, 404);
  }
}

export default NotFoundError;
