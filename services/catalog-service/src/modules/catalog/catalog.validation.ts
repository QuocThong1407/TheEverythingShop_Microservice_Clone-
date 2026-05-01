import { body, param, query } from 'express-validator';

// ==================== CATEGORY VALIDATION ====================
export const validateCreateCategory = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
  body('slug')
    .trim()
    .notEmpty().withMessage('Category slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
];

export const validateUpdateCategory = () => [
  param('categoryId')
    .trim()
    .notEmpty().withMessage('Category ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
];

// ==================== PRODUCT VALIDATION ====================
export const validateCreateProduct = () => [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('SKU must contain only uppercase letters, numbers, and hyphens'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('costPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
  body('stock')
    .notEmpty().withMessage('Stock is required')
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('categoryId')
    .trim()
    .notEmpty().withMessage('Category ID is required'),
];

export const validateUpdateProduct = () => [
  param('productId')
    .trim()
    .notEmpty().withMessage('Product ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

// ==================== REVIEW VALIDATION ====================
export const validateCreateReview = () => [
  body('productId')
    .trim()
    .notEmpty().withMessage('Product ID is required'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title')
    .trim()
    .notEmpty().withMessage('Review title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('comment')
    .trim()
    .notEmpty().withMessage('Review comment is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
];

export const validateUpdateReview = () => [
  param('reviewId')
    .trim()
    .notEmpty().withMessage('Review ID is required'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
];

// ==================== PROMOTION VALIDATION ====================
export const validateCreatePromotion = () => [
  body('productId')
    .trim()
    .notEmpty().withMessage('Product ID is required'),
  body('name')
    .trim()
    .notEmpty().withMessage('Promotion name is required')
    .isLength({ min: 2 }).withMessage('Promotion name must be at least 2 characters'),
  body('discountType')
    .trim()
    .notEmpty().withMessage('Discount type is required')
    .isIn(['PERCENTAGE', 'FIXED']).withMessage('Discount type must be PERCENTAGE or FIXED'),
  body('discountValue')
    .notEmpty().withMessage('Discount value is required')
    .isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid ISO 8601 date'),
];

// ==================== QUERY VALIDATION ====================
export const validateListProducts = () => [
  query('categoryId')
    .optional()
    .trim(),
  query('sellerId')
    .optional()
    .trim(),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['name', 'price', 'rating', 'createdAt']).withMessage('Invalid sort field'),
];
