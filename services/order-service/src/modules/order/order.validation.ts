import { body, param, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

// Validation Rules

export const validateCreateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least 1 item'),
  body('items.*.productId')
    .trim()
    .notEmpty()
    .withMessage('Product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.unitPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Unit price must be positive'),
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  body('shippingAddress.fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters'),
  body('shippingAddress.phoneNumber')
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits'),
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Street must be 5-100 characters'),
  body('shippingAddress.district')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('District is required'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City is required'),
  body('shippingAddress.country')
    .trim()
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be 2 letter code'),
  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be non-negative'),
  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be non-negative'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be max 500 characters'),
];

export const validateUpdateOrderStatus = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  body('status')
    .trim()
    .isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid order status'),
];

export const validateRequestReturn = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least 1 item must be returned'),
  body('items.*')
    .trim()
    .notEmpty()
    .withMessage('Product ID is required'),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be 10-500 characters'),
];

export const validateApproveReturn = [
  param('returnId')
    .trim()
    .notEmpty()
    .withMessage('Return ID is required'),
  body('refundAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be positive'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be max 500 characters'),
];

export const validateGetOrders = [
  query('userId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('User ID must not be empty'),
  query('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be >= 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
];

export const validateGetOrderById = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
];

export const validateGetReturnById = [
  param('returnId')
    .trim()
    .notEmpty()
    .withMessage('Return ID is required'),
];

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }));
    
    return res.status(400).json({
      message: 'Validation failed',
      statusCode: 400,
      errors: formattedErrors,
    });
  }
  next();
};
