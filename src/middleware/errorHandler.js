const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  logger.error('request_failed', {
    method: req.method,
    path: req.originalUrl,
    message: err.message
  });

  const isMulterError = err.name === 'MulterError';
  const isCastError = err.name === 'CastError';

  const statusCode =
    err.statusCode ||
    (isMulterError || isCastError ? 400 : 500);

  let message = err.message;

  if (isCastError) {
    message = 'Invalid resource ID';
  }

  if (statusCode === 500) {
    message = 'Internal server error';
  }

  return res.status(statusCode).json({
    error: {
      message
    }
  });
}

module.exports = errorHandler;