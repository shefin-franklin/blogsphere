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
