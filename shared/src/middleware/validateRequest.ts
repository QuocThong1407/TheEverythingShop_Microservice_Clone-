import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { RequestValidationError } from '../errors/index.js';

/**
 * Validation Request Middleware
 * Checks for validation errors from express-validator
 * and throws RequestValidationError if any
 */
export const validateRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: 'param' in error ? error.param : 'unknown',
      message: error.msg,
    }));

    throw new RequestValidationError(formattedErrors);
  }

  next();
};
