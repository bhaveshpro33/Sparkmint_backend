/**
 * errorMiddleware.js
 *
 * Two global Express middleware functions:
 *   1. notFound  – catches requests to unknown routes (404)
 *   2. errorHandler – central error handler for all thrown errors
 *
 * Usage in app.js:
 *   const { notFound, errorHandler } = require('./middleware/errorMiddleware');
 *   app.use(notFound);
 *   app.use(errorHandler);
 */

/**
 * notFound
 * Triggered when no route matches the incoming request.
 * Creates a 404 error and passes it to errorHandler.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error); // pass to errorHandler
};

/**
 * errorHandler
 * Central error handler for all errors thrown in the app.
 * Returns a consistent JSON error response.
 *
 * In development: includes the full stack trace.
 * In production: omits the stack trace.
 */
const errorHandler = (err, req, res, next) => {
  // Sometimes an error is thrown but Express still has a 200 status – fix that
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Show stack trace only in development for easier debugging
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
