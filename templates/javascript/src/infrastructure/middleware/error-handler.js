const { logger } = require('../logging/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (error, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Client errors raised by Express itself (malformed JSON, body too large) carry a 4xx status.
  const { status, expose } = error;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (typeof status === 'number' && status >= 400 && status < 500) {
    statusCode = status;
    message = expose ? error.message : 'Bad Request';
  }

  logger.error(
    {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    },
    'Error occurred'
  );

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

module.exports = { AppError, errorHandler };
