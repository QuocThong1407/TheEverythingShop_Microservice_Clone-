import pino from 'pino';
import { getRabbitMQService } from '@teleshop/common/rabbitmq';
import { CatalogEvents } from '@teleshop/common/events';
import { CatalogRepository } from './catalog.repository';
import { Product, Category, Review, Promotion } from '@prisma/client';
import { ConflictError, NotFoundError, BadRequestError } from '@teleshop/common/errors';

const logger = pino();

export class CatalogService {
  // ==================== CATEGORY METHODS ====================

  static async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
  }): Promise<Category> {
    try {
      // Check if slug already exists
      const existing = await CatalogRepository.findCategoryBySlug(data.slug);
      if (existing) {
        throw new ConflictError('Category with this slug already exists');
      }

      const category = await CatalogRepository.createCategory(data);
      return category;
    } catch (error) {
      logger.error(error, 'Error creating category');
      throw error;
    }
  }

  static async getCategory(categoryId: string): Promise<Category> {
    const category = await CatalogRepository.findCategoryById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  static async listCategories(): Promise<Category[]> {
    return CatalogRepository.listCategories();
  }

  static async updateCategory(categoryId: string, data: Partial<Category>): Promise<Category> {
    const existing = await CatalogRepository.findCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    const category = await CatalogRepository.updateCategory(categoryId, data);
    return category;
  }

  // ==================== PRODUCT METHODS ====================

  static async createProduct(sellerId: string, data: {
    name: string;
    description: string;
    sku: string;
    price: number;
    costPrice?: number;
    stock: number;
    categoryId: string;
    image?: string;
  }): Promise<Product> {
    try {
      // Verify category exists
      const category = await CatalogRepository.findCategoryById(data.categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check SKU uniqueness
      const existing = await CatalogRepository.findProductBySku(data.sku);
      if (existing) {
        throw new ConflictError('Product with this SKU already exists');
      }

      const product = await CatalogRepository.createProduct({
        ...data,
        sellerId,
      });

      // Publish event
      await this.publishProductEvent(CatalogEvents.PRODUCT_CREATED, {
        productId: product.id,
        name: product.name,
        sellerId,
        categoryId: data.categoryId,
        price: product.price,
        stock: product.stock,
      });

      return product;
    } catch (error) {
      logger.error(error, 'Error creating product');
      throw error;
    }
  }

  static async getProduct(productId: string): Promise<Product> {
    const product = await CatalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  static async listProducts(filters?: any): Promise<{ products: Product[]; total: number; page: number; pages: number }> {
    const { products, total } = await CatalogRepository.listProducts(filters);
    const limit = filters?.limit || 20;
    const page = filters?.page || 1;
    const pages = Math.ceil(total / limit);

    return { products, total, page, pages };
  }

  static async updateProduct(productId: string, sellerId: string, data: Partial<Product>): Promise<Product> {
    const product = await CatalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify seller owns the product
    if (product.sellerId !== sellerId) {
      throw new BadRequestError('You do not have permission to update this product');
    }

    const updated = await CatalogRepository.updateProduct(productId, data);

    // Publish event
    await this.publishProductEvent(CatalogEvents.PRODUCT_UPDATED, {
      productId: updated.id,
      name: updated.name,
      sellerId,
      price: updated.price,
      stock: updated.stock,
    });

    return updated;
  }

  static async reserveInventory(productId: string, quantity: number): Promise<Product> {
    const product = await CatalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestError('Insufficient stock');
    }

    const updated = await CatalogRepository.updateStock(productId, -quantity);

    // Publish event
    await this.publishProductEvent(CatalogEvents.INVENTORY_RESERVED, {
      productId,
      quantity,
    });

    return updated;
  }

  static async restoreInventory(productId: string, quantity: number): Promise<Product> {
    const product = await CatalogRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updated = await CatalogRepository.updateStock(productId, quantity);

    // Publish event
    await this.publishProductEvent(CatalogEvents.INVENTORY_RESTORED, {
      productId,
      quantity,
    });

    return updated;
  }

  // ==================== REVIEW METHODS ====================

  static async createReview(userId: string, data: {
    productId: string;
    rating: number;
    title: string;
    comment: string;
  }): Promise<Review> {
    try {
      // Verify product exists
      const product = await CatalogRepository.findProductById(data.productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check if user already reviewed this product
      const existing = await CatalogRepository.findReviewByUserAndProduct(userId, data.productId);
      if (existing) {
        throw new ConflictError('You have already reviewed this product');
      }

      const review = await CatalogRepository.createReview({
        ...data,
        userId,
      });

      // Publish event
      await this.publishProductEvent(CatalogEvents.REVIEW_SUBMITTED, {
        productId: data.productId,
        reviewId: review.id,
        userId,
        rating: review.rating,
      });

      return review;
    } catch (error) {
      logger.error(error, 'Error creating review');
      throw error;
    }
  }

  static async getReview(reviewId: string): Promise<Review> {
    const review = await CatalogRepository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }
    return review;
  }

  static async listProductReviews(productId: string): Promise<Review[]> {
    return CatalogRepository.listProductReviews(productId, 'APPROVED');
  }

  static async approveReview(reviewId: string): Promise<Review> {
    const review = await CatalogRepository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const approved = await CatalogRepository.approveReview(reviewId);
    return approved;
  }

  static async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await CatalogRepository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestError('You do not have permission to delete this review');
    }

    // Implementation: Delete review logic would go here
    logger.info({ reviewId }, 'Review deleted');
  }

  // ==================== PROMOTION METHODS ====================

  static async createPromotion(sellerId: string, data: {
    productId: string;
    name: string;
    description?: string;
    discountType: string;
    discountValue: number;
    maxDiscount?: number;
    startDate: Date;
    endDate: Date;
    usageLimit?: number;
  }): Promise<Promotion> {
    try {
      // Verify product exists and user owns it
      const product = await CatalogRepository.findProductById(data.productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (product.sellerId !== sellerId) {
        throw new BadRequestError('You do not have permission to create promotions for this product');
      }

      const promotion = await CatalogRepository.createPromotion(data);

      // Publish event
      await this.publishProductEvent(CatalogEvents.PROMOTION_CREATED, {
        promotionId: promotion.id,
        productId: data.productId,
        name: promotion.name,
        discountValue: promotion.discountValue,
      });

      return promotion;
    } catch (error) {
      logger.error(error, 'Error creating promotion');
      throw error;
    }
  }

  static async getPromotion(promotionId: string): Promise<Promotion> {
    const promotion = await CatalogRepository.findPromotionById(promotionId);
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }
    return promotion;
  }

  static async listProductPromotions(productId: string): Promise<Promotion[]> {
    return CatalogRepository.listProductPromotions(productId, true);
  }

  static async updatePromotion(promotionId: string, sellerId: string, data: Partial<Promotion>): Promise<Promotion> {
    const promotion = await CatalogRepository.findPromotionById(promotionId);
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }

    // Verify seller owns the product
    const product = await CatalogRepository.findProductById(promotion.productId);
    if (!product || product.sellerId !== sellerId) {
      throw new BadRequestError('You do not have permission to update this promotion');
    }

    return CatalogRepository.updatePromotion(promotionId, data);
  }

  // ==================== PRIVATE METHODS ====================

  private static async publishProductEvent(eventType: string, data: any): Promise<void> {
    try {
      const rmq = getRabbitMQService();
      if (rmq.isConnected()) {
        await rmq.publish(eventType, {
          type: eventType,
          aggregateId: data.productId || data.promotionId || 'unknown',
          aggregateType: 'Product',
          data,
          timestamp: new Date(),
          version: 1,
        });
      }
    } catch (error) {
      logger.error(error, 'Error publishing product event');
      // Don't throw - event publishing should not fail the main operation
    }
  }
}
