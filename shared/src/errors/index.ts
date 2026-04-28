/**
 * Base Error Class
 * All custom errors inherit from this
 */
export abstract class BaseError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }

  serializeErrors() {
    return [
      {
        message: this.message,
        statusCode: this.statusCode,
      },
    ];
  }
}

/**
 * Request Validation Error - 400 Bad Request
 * Used when request body/query/params validation fails
 */
export class RequestValidationError extends BaseError {
  statusCode = 400;
  reason = 'Invalid request parameters';

  constructor(
    public errors: {
      field?: string;
      message: string;
    }[]
  ) {
    super('Invalid request');
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((err) => ({
      message: err.message,
      field: err.field,
      statusCode: this.statusCode,
    }));
  }
}

/**
 * Not Found Error - 404
 * Used when resource is not found
 */
export class NotFoundError extends BaseError {
  statusCode = 404;

  constructor(message: string = 'Resource not found') {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Database Connection Error - 500
 * Used when database connection fails
 */
export class DatabaseConnectionError extends BaseError {
  statusCode = 500;
  reason = 'Database connection failed';

  constructor(message: string = 'Database connection failed') {
    super(message);
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }
}

/**
 * Bad Request Error - 400
 * Generic bad request error
 */
export class BadRequestError extends BaseError {
  statusCode = 400;

  constructor(message: string = 'Bad request') {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Unauthorized Error - 401
 * Used when authentication fails
 */
export class UnauthorizedError extends BaseError {
  statusCode = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden Error - 403
 * Used when user doesn't have permission
 */
export class ForbiddenError extends BaseError {
  statusCode = 403;

  constructor(message: string = 'Access forbidden') {
    super(message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Conflict Error - 409
 * Used when resource already exists or conflict occurs
 */
export class ConflictError extends BaseError {
  statusCode = 409;

  constructor(message: string = 'Resource conflict') {
    super(message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Service Unavailable Error - 503
 * Used when external service is unavailable
 */
export class ServiceUnavailableError extends BaseError {
  statusCode = 503;

  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Internal Server Error - 500
 * Generic server error
 */
export class InternalServerError extends BaseError {
  statusCode = 500;

  constructor(message: string = 'Internal server error') {
    super(message);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
