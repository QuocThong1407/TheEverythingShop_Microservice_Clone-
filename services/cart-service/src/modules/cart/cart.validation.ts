import { body, param, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

// Validation Rules

export const validateAddToCart = [
  body('productId')
    .trim()
    .notEmpty()
    .withMessage('Product ID is required'),
  body('productName')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Product name must be 2-500 characters'),
  body('productSku')
    .trim()
    .notEmpty()
    .withMessage('Product SKU is required'),
  body('quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be 1-1000'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be positive'),
  body('image')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image must be valid URL'),
  body('selectedVariants')
    .optional()
    .isObject()
    .withMessage('Selected variants must be object'),
];

export const validateUpdateCartItem = [
  param('itemId')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be 1-1000'),
];

export const validateRemoveFromCart = [
  param('itemId')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
];

export const validateCheckout = [
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
    .optional()
    .trim()
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

export const validateGetCart = [
  query('userId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('User ID must not be empty'),
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
