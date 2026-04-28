import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import pino from 'pino';

const logger = pino();

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  iat?: number;
  exp?: number;
}

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      currentUser?: JwtPayload;
    }
  }
}

/**
 * Current User Middleware
 * Extracts JWT token from Authorization header and verifies it
 * Sets req.currentUser if token is valid
 * Does NOT require auth - continues to next middleware if no token
 */
export const currentUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  try {
    // Bearer token format: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    // Get public key from environment or use a default
    const publicKey = process.env.JWT_PUBLIC_KEY || 'your-public-key';

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['HS256', 'RS256'],
    }) as JwtPayload;

    req.currentUser = decoded;
    next();
  } catch (error) {
    logger.warn({
      msg: 'Invalid JWT token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * Require Auth Middleware
 * Ensures user is authenticated (must have JWT token)
 * Use AFTER currentUser middleware
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.currentUser) {
    throw new UnauthorizedError('Must be authenticated');
  }

  next();
};

/**
 * Require Role Middleware
 * Ensures user has specific role(s)
 * Use AFTER requireAuth middleware
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      throw new UnauthorizedError('Must be authenticated');
    }

    if (!roles.includes(req.currentUser.role)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};
