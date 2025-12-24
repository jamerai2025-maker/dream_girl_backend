const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * @desc    Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.userId || 'anonymous'
  });

  // ==================== MONGOOSE ERRORS ====================

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    error = ApiError.validation('Validation failed', errors);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = ApiError.conflict(`${field} '${value}' already exists`);
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // ==================== JWT ERRORS ====================

  // JWT Invalid Token
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }

  // JWT Expired Token
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired');
  }

  // ==================== MULTER ERRORS ====================

  // File too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File too large');
  }

  // Unexpected file field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest('Unexpected file field');
  }

  // ==================== SYNTAX ERRORS ====================

  // JSON Parse Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = ApiError.badRequest('Invalid JSON');
  }

  // ==================== DEFAULT ERROR ====================

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
};

/**
 * @desc    Handle 404 - Route not found
 */
const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * @desc    Handle async errors in routes without try-catch
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncErrorHandler
};