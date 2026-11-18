/**
 * Wraps an async route handler to forward unhandled rejections to the central error middleware.
 * @param {Function} fn Async controller function
 * @returns {Function} Express route handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
