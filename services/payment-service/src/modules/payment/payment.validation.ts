import { body, param, query } from 'express-validator'

export const validateCreatePayment = [
  body('orderId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid order ID required'),
  body('userId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid user ID required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .notEmpty()
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3-character code (e.g., VND, USD)'),
  body('paymentMethod')
    .isString()
    .trim()
    .notEmpty()
    .isIn(['VNPAY', 'STRIPE', 'MOMO', 'CARD', 'BANK_TRANSFER'])
    .withMessage('Valid payment method required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be object'),
]

export const validateGetPayment = [
  param('paymentId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid payment ID required'),
]

export const validateConfirmPayment = [
  param('paymentId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid payment ID required'),
  body('transactionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Transaction ID required'),
  body('gatewayResponse')
    .optional()
    .isObject()
    .withMessage('Gateway response must be object'),
]

export const validateWebhook = [
  body('orderId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid order ID required'),
  body('transactionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Transaction ID required'),
  body('status')
    .isIn(['SUCCESS', 'FAILED', 'PENDING'])
    .withMessage('Valid payment status required'),
  body('gatewayResponse')
    .optional()
    .isObject()
    .withMessage('Gateway response must be object'),
]

export const validateInitiateRefund = [
  param('paymentId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid payment ID required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .notEmpty()
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be 10-500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be object'),
]

export const validateGetRefund = [
  param('refundId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid refund ID required'),
]

export const validateConfirmRefund = [
  param('refundId')
    .isUUID()
    .notEmpty()
    .withMessage('Valid refund ID required'),
  body('refundTransactionId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Refund transaction ID required'),
  body('status')
    .isIn(['COMPLETED', 'FAILED'])
    .withMessage('Valid refund status required'),
  body('gatewayResponse')
    .optional()
    .isObject()
    .withMessage('Gateway response must be object'),
]

export const validateListPayments = [
  query('userId')
    .optional()
    .isUUID()
    .withMessage('Valid user ID required'),
  query('orderId')
    .optional()
    .isUUID()
    .withMessage('Valid order ID required'),
  query('status')
    .optional()
    .isIn(['PENDING', 'AUTHORIZED', 'CAPTURED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'])
    .withMessage('Valid payment status required'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Skip must be non-negative integer'),
  query('take')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Take must be 1-100'),
]

export const validateListRefunds = [
  query('paymentId')
    .optional()
    .isUUID()
    .withMessage('Valid payment ID required'),
  query('orderId')
    .optional()
    .isUUID()
    .withMessage('Valid order ID required'),
  query('status')
    .optional()
    .isIn(['PENDING', 'INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'])
    .withMessage('Valid refund status required'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Skip must be non-negative integer'),
  query('take')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Take must be 1-100'),
]
