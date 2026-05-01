import { Router } from 'express';
import { validateRequest, currentUser, requireAuth } from '@teleshop/common/middleware';
import { asyncHandler } from '@teleshop/common/middleware';
import { AccountController } from './account.controller';
import {
  validateCreateProfile,
  validateUpdateProfile,
  validateAddAddress,
  validateUpdateAddress,
  validateDeleteAddress,
} from './account.validation';

const router = Router();

/**
 * All routes require authentication
 */
router.use(currentUser);
router.use(requireAuth);

/**
 * Profile routes
 */

/**
 * GET /api/account/profile
 * Get user profile
 */
router.get('/profile', asyncHandler(AccountController.getProfile));

/**
 * POST /api/account/profile
 * Create user profile
 */
router.post(
  '/profile',
  validateCreateProfile(),
  validateRequest,
  asyncHandler(AccountController.createProfile)
);

/**
 * PUT /api/account/profile
 * Update user profile
 */
router.put(
  '/profile',
  validateUpdateProfile(),
  validateRequest,
  asyncHandler(AccountController.updateProfile)
);

/**
 * Addresses routes
 */

/**
 * GET /api/account/addresses
 * Get all addresses
 */
router.get('/addresses', asyncHandler(AccountController.getAddresses));

/**
 * POST /api/account/addresses
 * Add new address
 */
router.post(
  '/addresses',
  validateAddAddress(),
  validateRequest,
  asyncHandler(AccountController.addAddress)
);

/**
 * PUT /api/account/addresses/:addressId
 * Update address
 */
router.put(
  '/addresses/:addressId',
  validateUpdateAddress(),
  validateRequest,
  asyncHandler(AccountController.updateAddress)
);

/**
 * DELETE /api/account/addresses/:addressId
 * Delete address
 */
router.delete(
  '/addresses/:addressId',
  validateDeleteAddress(),
  validateRequest,
  asyncHandler(AccountController.deleteAddress)
);

/**
 * POST /api/account/addresses/:addressId/set-default
 * Set address as default
 */
router.post(
  '/addresses/:addressId/set-default',
  asyncHandler(AccountController.setDefaultAddress)
);

/**
 * Preferences routes
 */

/**
 * GET /api/account/preferences
 * Get user preferences
 */
router.get('/preferences', asyncHandler(AccountController.getPreferences));

/**
 * PUT /api/account/preferences
 * Update user preferences
 */
router.put(
  '/preferences',
  asyncHandler(AccountController.updatePreferences)
);

/**
 * Membership routes
 */

/**
 * GET /api/account/membership
 * Get membership information
 */
router.get('/membership', asyncHandler(AccountController.getMembership));

export default router;
