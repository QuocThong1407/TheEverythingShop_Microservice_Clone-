import { Router } from 'express';
import { validateRequest, currentUser, requireAuth } from '@teleshop/common/middleware';
import { asyncHandler } from '@teleshop/common/middleware';
import { AuthController } from './auth.controller';
import {
  validateSignup,
  validateLogin,
  validateChangePassword,
} from './auth.validation';

const router = Router();

/**
 * Public routes
 */

/**
 * POST /api/auth/signup
 * Register new user
 * Body: { email, password, firstName, lastName }
 * Response: { user, accessToken, refreshToken }
 */
router.post(
  '/signup',
  validateSignup(),
  validateRequest,
  asyncHandler(AuthController.signup)
);

/**
 * POST /api/auth/login
 * Authenticate user
 * Body: { email, password }
 * Response: { user, accessToken, refreshToken }
 */
router.post(
  '/login',
  validateLogin(),
  validateRequest,
  asyncHandler(AuthController.login)
);

/**
 * Protected routes (require authentication)
 */

/**
 * GET /api/auth/profile
 * Get current user profile
 * Headers: Authorization: Bearer <token>
 * Response: { user }
 */
router.get(
  '/profile',
  currentUser,
  requireAuth,
  asyncHandler(AuthController.getProfile)
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 * Body: { refreshToken }
 * Headers: Authorization: Bearer <token>
 * Response: { accessToken }
 */
router.post(
  '/refresh',
  currentUser,
  requireAuth,
  asyncHandler(AuthController.refresh)
);

/**
 * POST /api/auth/logout
 * Log out user
 * Body: { refreshToken }
 * Headers: Authorization: Bearer <token>
 * Response: { message }
 */
router.post(
  '/logout',
  currentUser,
  requireAuth,
  asyncHandler(AuthController.logout)
);

/**
 * POST /api/auth/change-password
 * Change user password
 * Body: { currentPassword, newPassword, confirmPassword }
 * Headers: Authorization: Bearer <token>
 * Response: { message }
 */
router.post(
  '/change-password',
  currentUser,
  requireAuth,
  validateChangePassword(),
  validateRequest,
  asyncHandler(AuthController.changePassword)
);

/**
 * POST /api/auth/verify-token
 * Verify access token (for internal services)
 * Headers: Authorization: Bearer <token>
 * Response: { valid, user }
 */
router.post(
  '/verify-token',
  currentUser,
  asyncHandler(AuthController.verifyToken)
);

export default router;
