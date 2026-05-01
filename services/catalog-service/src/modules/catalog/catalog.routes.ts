import { Router } from 'express';
import { validateRequest, currentUser, requireAuth, asyncHandler } from '@teleshop/common/middleware';
import { CatalogController } from './catalog.controller';
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateCreateProduct,
  validateUpdateProduct,
  validateCreateReview,
  validateUpdateReview,
  validateCreatePromotion,
  validateListProducts,
} from './catalog.validation';

const router = Router();

// ==================== CATEGORY ROUTES ====================

/**
 * POST /api/catalog/categories
 * Create category (Admin only)
 */
router.post(
  '/categories',
  currentUser,
  validateCreateCategory(),
  validateRequest,
  asyncHandler(CatalogController.createCategory)
);

/**
 * GET /api/catalog/categories
 * Get all categories
 */
router.get('/categories', asyncHandler(CatalogController.listCategories));

/**
 * GET /api/catalog/categories/:categoryId
 * Get category by ID
 */
router.get('/categories/:categoryId', asyncHandler(CatalogController.getCategory));

/**
 * PUT /api/catalog/categories/:categoryId
 * Update category (Admin only)
 */
router.put(
  '/categories/:categoryId',
  currentUser,
  validateUpdateCategory(),
  validateRequest,
  asyncHandler(CatalogController.updateCategory)
);

// ==================== PRODUCT ROUTES ====================

/**
 * POST /api/catalog/products
 * Create product (Sellers only)
 */
router.post(
  '/products',
  currentUser,
  requireAuth,
  validateCreateProduct(),
  validateRequest,
  asyncHandler(CatalogController.createProduct)
);

/**
 * GET /api/catalog/products
 * List products
 */
router.get(
  '/products',
  validateListProducts(),
  validateRequest,
  asyncHandler(CatalogController.listProducts)
);

/**
 * GET /api/catalog/products/:productId
 * Get product by ID
 */
router.get('/products/:productId', asyncHandler(CatalogController.getProduct));

/**
 * PUT /api/catalog/products/:productId
 * Update product (Seller who owns product)
 */
router.put(
  '/products/:productId',
  currentUser,
  requireAuth,
  validateUpdateProduct(),
  validateRequest,
  asyncHandler(CatalogController.updateProduct)
);

// ==================== REVIEW ROUTES ====================

/**
 * POST /api/catalog/products/:productId/reviews
 * Create review
 */
router.post(
  '/products/:productId/reviews',
  currentUser,
  requireAuth,
  validateCreateReview(),
  validateRequest,
  asyncHandler(CatalogController.createReview)
);

/**
 * GET /api/catalog/products/:productId/reviews
 * Get product reviews
 */
router.get('/products/:productId/reviews', asyncHandler(CatalogController.listProductReviews));

/**
 * GET /api/catalog/reviews/:reviewId
 * Get review by ID
 */
router.get('/reviews/:reviewId', asyncHandler(CatalogController.getReview));

/**
 * DELETE /api/catalog/reviews/:reviewId
 * Delete review (User who created review)
 */
router.delete(
  '/reviews/:reviewId',
  currentUser,
  requireAuth,
  asyncHandler(CatalogController.deleteReview)
);

// ==================== PROMOTION ROUTES ====================

/**
 * POST /api/catalog/products/:productId/promotions
 * Create promotion
 */
router.post(
  '/products/:productId/promotions',
  currentUser,
  requireAuth,
  validateCreatePromotion(),
  validateRequest,
  asyncHandler(CatalogController.createPromotion)
);

/**
 * GET /api/catalog/products/:productId/promotions
 * Get active promotions for product
 */
router.get('/products/:productId/promotions', asyncHandler(CatalogController.listProductPromotions));

/**
 * GET /api/catalog/promotions/:promotionId
 * Get promotion by ID
 */
router.get('/promotions/:promotionId', asyncHandler(CatalogController.getPromotion));

/**
 * PUT /api/catalog/promotions/:promotionId
 * Update promotion
 */
router.put(
  '/promotions/:promotionId',
  currentUser,
  requireAuth,
  asyncHandler(CatalogController.updatePromotion)
);

export default router;
