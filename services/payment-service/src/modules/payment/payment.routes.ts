import { Router } from 'express'
import { requireAuth, requireRole, validateRequest } from '@teleshop/common/middleware'
import * as controllers from './payment.controller.js'
import * as validators from './payment.validation.js'

const router = Router()

/**
 * Payment endpoints
 */

// Create payment
router.post(
  '/',
  requireAuth,
  validators.validateCreatePayment,
  validateRequest,
  controllers.createPayment
)

// Get payment by ID
router.get(
  '/:paymentId',
  requireAuth,
  validators.validateGetPayment,
  validateRequest,
  controllers.getPayment
)

// Get payment by order ID
router.get(
  '/order/:orderId',
  requireAuth,
  controllers.getPaymentByOrder
)

// List payments
router.get(
  '/',
  requireAuth,
  validators.validateListPayments,
  validateRequest,
  controllers.listPayments
)

// Confirm payment
router.post(
  '/:paymentId/confirm',
  requireAuth,
  validators.validateConfirmPayment,
  validateRequest,
  controllers.confirmPayment
)

// Cancel payment
router.post(
  '/:paymentId/cancel',
  requireAuth,
  controllers.cancelPayment
)

/**
 * Refund endpoints
 */

// Initiate refund
router.post(
  '/:paymentId/refund',
  requireAuth,
  requireRole('ADMIN'),
  validators.validateInitiateRefund,
  validateRequest,
  controllers.initiateRefund
)

// Get refund by ID
router.get(
  '/refund/:refundId',
  requireAuth,
  validators.validateGetRefund,
  validateRequest,
  controllers.getRefund
)

// List refunds
router.get(
  '/refunds',
  requireAuth,
  validators.validateListRefunds,
  validateRequest,
  controllers.listRefunds
)

// Confirm refund
router.post(
  '/refund/:refundId/confirm',
  requireAuth,
  requireRole('ADMIN'),
  validators.validateConfirmRefund,
  validateRequest,
  controllers.confirmRefund
)

// Get refunds for payment
router.get(
  '/:paymentId/refunds',
  requireAuth,
  controllers.getRefundsByPayment
)

/**
 * Webhook endpoints (no auth required)
 */

// VNPAY callback
router.post(
  '/webhook/vnpay',
  validators.validateWebhook,
  validateRequest,
  controllers.vnpayCallback
)

// Momo callback
router.post(
  '/webhook/momo',
  validators.validateWebhook,
  validateRequest,
  controllers.momoCallback
)

export default router
