import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Client errors raised by Express itself (malformed JSON, body too large) carry a 4xx status.
  const { status, expose } = error as Error & { status?: number; expose?: boolean };

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
