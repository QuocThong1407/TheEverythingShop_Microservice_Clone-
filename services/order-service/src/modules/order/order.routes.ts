import { Router } from 'express';
import { requireAuth } from '@teleshop/common/middleware';
import OrderController from './order.controller';
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateRequestReturn,
  validateApproveReturn,
  validateGetOrders,
  validateGetOrderById,
  validateGetReturnById,
  handleValidationErrors,
} from './order.validation';

const router = Router();

// ============ ORDER ROUTES ============

// Create order (requires authentication)
router.post(
  '/',
  requireAuth,
  validateCreateOrder,
  handleValidationErrors,
  (req, res) => OrderController.createOrder(req, res)
);

// Get user's orders (requires authentication)
router.get(
  '/',
  requireAuth,
  validateGetOrders,
  handleValidationErrors,
  (req, res) => OrderController.getUserOrders(req, res)
);

// Get specific order (requires authentication)
router.get(
  '/:orderId',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.getOrder(req, res)
);

// Confirm order (requires authentication)
router.patch(
  '/:orderId/confirm',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.confirmOrder(req, res)
);

// Ship order (requires admin)
router.patch(
  '/:orderId/ship',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.shipOrder(req, res)
);

// Deliver order (requires admin)
router.patch(
  '/:orderId/deliver',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.deliverOrder(req, res)
);

// Cancel order (requires authentication)
router.patch(
  '/:orderId/cancel',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.cancelOrder(req, res)
);

// Get order statistics (requires authentication)
router.get(
  '/:userId/stats',
  requireAuth,
  (req, res) => OrderController.getUserOrderStats(req, res)
);

// ============ RETURN ROUTES ============

// Request return (requires authentication)
router.post(
  '/:orderId/returns',
  requireAuth,
  validateRequestReturn,
  handleValidationErrors,
  (req, res) => OrderController.requestReturn(req, res)
);

// Get order returns (requires authentication)
router.get(
  '/:orderId/returns',
  requireAuth,
  validateGetOrderById,
  handleValidationErrors,
  (req, res) => OrderController.getOrderReturns(req, res)
);

// Get specific return (requires authentication)
router.get(
  '/returns/:returnId',
  requireAuth,
  validateGetReturnById,
  handleValidationErrors,
  (req, res) => OrderController.getReturn(req, res)
);

// Approve return (requires admin)
router.patch(
  '/returns/:returnId/approve',
  requireAuth,
  validateApproveReturn,
  handleValidationErrors,
  (req, res) => OrderController.approveReturn(req, res)
);

// Complete return (requires admin)
router.patch(
  '/returns/:returnId/complete',
  requireAuth,
  validateGetReturnById,
  handleValidationErrors,
  (req, res) => OrderController.completeReturn(req, res)
);

export default router;
