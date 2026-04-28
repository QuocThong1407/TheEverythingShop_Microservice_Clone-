import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../errors/index.js';
import pino from 'pino';

const logger = pino();

/**
 * Global Error Handler Middleware
 * Catches all errors thrown in route handlers and middlewares
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    type: err.constructor.name,
  });

  if (err instanceof BaseError) {
    const errors = err.serializeErrors();
    return res.status(err.statusCode).send(errors);
  }

  // Default error response
  res.status(500).send([
    {
      message: 'Internal server error',
      statusCode: 500,
    },
  ]);
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
