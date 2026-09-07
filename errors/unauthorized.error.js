import AppError from "../errors/app.error.js";

/**
 * 401 Unauthorized
 */

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401);
  }
}

export default UnauthorizedError;