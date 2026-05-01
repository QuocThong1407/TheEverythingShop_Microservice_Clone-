import { Request, Response } from 'express';
import pino from 'pino';
import { CatalogService } from './catalog.service';
import { BadRequestError } from '@teleshop/common/errors';

const logger = pino();

export class CatalogController {
  // ==================== CATEGORY ENDPOINTS ====================

  /**
   * POST /api/catalog/categories
   * Create new category (Admin only)
   */
  static async createCategory(req: Request, res: Response): Promise<void> {
    const { name, slug, description, image } = req.body;

    const category = await CatalogService.createCategory({
      name,
      slug,
      description,
      image,
    });

    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  }

  /**
   * GET /api/catalog/categories
   * Get all categories
   */
  static async listCategories(req: Request, res: Response): Promise<void> {
    const categories = await CatalogService.listCategories();

    res.status(200).json({
      message: 'Categories retrieved successfully',
      categories,
    });
  }

  /**
   * GET /api/catalog/categories/:categoryId
   * Get category by ID
   */
  static async getCategory(req: Request, res: Response): Promise<void> {
    const { categoryId } = req.params;
    const category = await CatalogService.getCategory(categoryId);

    res.status(200).json({
      message: 'Category retrieved successfully',
      category,
    });
  }

  /**
   * PUT /api/catalog/categories/:categoryId
   * Update category
   */
  static async updateCategory(req: Request, res: Response): Promise<void> {
    const { categoryId } = req.params;
    const { name, slug, description, image } = req.body;

    const category = await CatalogService.updateCategory(categoryId, {
      name,
      slug,
      description,
      image,
    } as any);

    res.status(200).json({
      message: 'Category updated successfully',
      category,
    });
  }

  // ==================== PRODUCT ENDPOINTS ====================

  /**
   * POST /api/catalog/products
   * Create new product (Sellers only)
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { name, description, sku, price, costPrice, stock, categoryId, image } = req.body;

    const product = await CatalogService.createProduct(req.currentUser.id, {
      name,
      description,
      sku,
      price,
      costPrice,
      stock,
      categoryId,
      image,
    });

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  }

  /**
   * GET /api/catalog/products
   * List products with pagination and filtering
   */
  static async listProducts(req: Request, res: Response): Promise<void> {
    const { categoryId, sellerId, status, page, limit, sort } = req.query;

    const result = await CatalogService.listProducts({
      categoryId: categoryId as string,
      sellerId: sellerId as string,
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sort: sort as string,
    });

    res.status(200).json({
      message: 'Products retrieved successfully',
      ...result,
    });
  }

  /**
   * GET /api/catalog/products/:productId
   * Get product by ID
   */
  static async getProduct(req: Request, res: Response): Promise<void> {
    const { productId } = req.params;
    const product = await CatalogService.getProduct(productId);

    res.status(200).json({
      message: 'Product retrieved successfully',
      product,
    });
  }

  /**
   * PUT /api/catalog/products/:productId
   * Update product (Seller who owns product only)
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { productId } = req.params;
    const { name, description, price, stock, status, image } = req.body;

    const product = await CatalogService.updateProduct(productId, req.currentUser.id, {
      name,
      description,
      price,
      stock,
      status,
      image,
    } as any);

    res.status(200).json({
      message: 'Product updated successfully',
      product,
    });
  }

  // ==================== REVIEW ENDPOINTS ====================

  /**
   * POST /api/catalog/products/:productId/reviews
   * Create review (Customers only)
   */
  static async createReview(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    const review = await CatalogService.createReview(req.currentUser.id, {
      productId,
      rating,
      title,
      comment,
    });

    res.status(201).json({
      message: 'Review created successfully',
      review,
    });
  }

  /**
   * GET /api/catalog/products/:productId/reviews
   * Get product reviews
   */
  static async listProductReviews(req: Request, res: Response): Promise<void> {
    const { productId } = req.params;
    const reviews = await CatalogService.listProductReviews(productId);

    res.status(200).json({
      message: 'Reviews retrieved successfully',
      reviews,
      count: reviews.length,
    });
  }

  /**
   * GET /api/catalog/reviews/:reviewId
   * Get review by ID
   */
  static async getReview(req: Request, res: Response): Promise<void> {
    const { reviewId } = req.params;
    const review = await CatalogService.getReview(reviewId);

    res.status(200).json({
      message: 'Review retrieved successfully',
      review,
    });
  }

  /**
   * DELETE /api/catalog/reviews/:reviewId
   * Delete review (User who created review only)
   */
  static async deleteReview(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { reviewId } = req.params;
    await CatalogService.deleteReview(reviewId, req.currentUser.id);

    res.status(200).json({
      message: 'Review deleted successfully',
    });
  }

  // ==================== PROMOTION ENDPOINTS ====================

  /**
   * POST /api/catalog/products/:productId/promotions
   * Create promotion (Seller who owns product only)
   */
  static async createPromotion(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { productId } = req.params;
    const { name, description, discountType, discountValue, maxDiscount, startDate, endDate, usageLimit } = req.body;

    const promotion = await CatalogService.createPromotion(req.currentUser.id, {
      productId,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit,
    });

    res.status(201).json({
      message: 'Promotion created successfully',
      promotion,
    });
  }

  /**
   * GET /api/catalog/products/:productId/promotions
   * Get active promotions for product
   */
  static async listProductPromotions(req: Request, res: Response): Promise<void> {
    const { productId } = req.params;
    const promotions = await CatalogService.listProductPromotions(productId);

    res.status(200).json({
      message: 'Promotions retrieved successfully',
      promotions,
      count: promotions.length,
    });
  }

  /**
   * GET /api/catalog/promotions/:promotionId
   * Get promotion by ID
   */
  static async getPromotion(req: Request, res: Response): Promise<void> {
    const { promotionId } = req.params;
    const promotion = await CatalogService.getPromotion(promotionId);

    res.status(200).json({
      message: 'Promotion retrieved successfully',
      promotion,
    });
  }

  /**
   * PUT /api/catalog/promotions/:promotionId
   * Update promotion
   */
  static async updatePromotion(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new BadRequestError('Authentication required');
    }

    const { promotionId } = req.params;
    const { name, description, active, startDate, endDate } = req.body;

    const promotion = await CatalogService.updatePromotion(promotionId, req.currentUser.id, {
      name,
      description,
      active,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    } as any);

    res.status(200).json({
      message: 'Promotion updated successfully',
      promotion,
    });
  }
}
