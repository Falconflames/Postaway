/**
 * Wraps an async Express route handler and forwards rejected promises
 * to Express's error-handling middleware.
 *
 * @param {Function} fn - Async route handler.
 */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;