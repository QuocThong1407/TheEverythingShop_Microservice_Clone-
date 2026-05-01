import { Router } from 'express';
import { requireAuth } from '@teleshop/common/middleware';
import CartController from './cart.controller';
import {
  validateAddToCart,
  validateUpdateCartItem,
  validateRemoveFromCart,
  validateCheckout,
  handleValidationErrors,
} from './cart.validation';

const router = Router();

// ============ USER CART ROUTES ============

// Get user's cart (requires authentication)
router.get(
  '/',
  requireAuth,
  (req, res) => CartController.getCart(req, res)
);

// Add item to cart (requires authentication)
router.post(
  '/',
  requireAuth,
  validateAddToCart,
  handleValidationErrors,
  (req, res) => CartController.addToCart(req, res)
);

// Update cart item (requires authentication)
router.put(
  '/:itemId',
  requireAuth,
  validateUpdateCartItem,
  handleValidationErrors,
  (req, res) => CartController.updateCartItem(req, res)
);

// Remove item from cart (requires authentication)
router.delete(
  '/:itemId',
  requireAuth,
  validateRemoveFromCart,
  handleValidationErrors,
  (req, res) => CartController.removeFromCart(req, res)
);

// Clear entire cart (requires authentication)
router.delete(
  '/',
  requireAuth,
  (req, res) => CartController.clearCart(req, res)
);

// Get cart statistics (requires authentication)
router.get(
  '/stats',
  requireAuth,
  (req, res) => CartController.getCartStats(req, res)
);

// ============ CHECKOUT ROUTES ============

// Checkout (requires authentication)
router.post(
  '/checkout',
  requireAuth,
  validateCheckout,
  handleValidationErrors,
  (req, res) => CartController.checkout(req, res)
);

// ============ ADMIN ROUTES ============

// Get all user carts (requires admin)
router.get(
  '/admin/carts',
  requireAuth,
  (req, res) => CartController.getUserCarts(req, res)
);

// Delete user cart (requires admin)
router.delete(
  '/admin/carts/:userId',
  requireAuth,
  (req, res) => CartController.deleteUserCart(req, res)
);

export default router;
