// ApiError.js
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ApiResponse.js
export class ApiResponse {
  static success(res, data, statusCode = 200, message = 'OK') {
    return res.status(statusCode).json({ success: true, message, data });
  }
  static created(res, data, message = 'Created') {
    return res.status(201).json({ success: true, message, data });
  }
  static noContent(res) { return res.status(204).end(); }
  static paginate(res, { items, total, page, pages, limit }) {
    return res.json({ success: true, data: items, pagination: { total, page, pages, limit } });
  }
}

// asyncHandler.js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// middleware/error.js
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

export const notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.originalUrl}`));

export const errorHandler = (err, req, res, next) => {
  let error = err;
  if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Server Error');
  }
  if (error.statusCode >= 500) logger.error(err);
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details && { details: error.details }),
    ...(!isProd && { stack: err.stack }),
  });
};
