import pino from 'pino';
import { PrismaClient, Product, Category, Review, Promotion } from '@prisma/client';
import { NotFoundError, BadRequestError } from '@teleshop/common/errors';

const logger = pino();
const prisma = new PrismaClient();

export class CatalogRepository {
  // ==================== CATEGORY METHODS ====================

  static async createCategory(data: { name: string; slug: string; description?: string; image?: string }): Promise<Category> {
    try {
      const category = await prisma.category.create({
        data,
      });
      logger.info({ categoryId: category.id }, 'Category created');
      return category;
    } catch (error) {
      logger.error(error, 'Error creating category');
      throw error;
    }
  }

  static async findCategoryById(id: string): Promise<Category | null> {
    try {
      return await prisma.category.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Error finding category');
      throw error;
    }
  }

  static async findCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      return await prisma.category.findUnique({
        where: { slug },
      });
    } catch (error) {
      logger.error(error, 'Error finding category by slug');
      throw error;
    }
  }

  static async listCategories(): Promise<Category[]> {
    try {
      return await prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(error, 'Error listing categories');
      throw error;
    }
  }

  static async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    try {
      const category = await prisma.category.update({
        where: { id },
        data,
      });
      logger.info({ categoryId: id }, 'Category updated');
      return category;
    } catch (error) {
      logger.error(error, 'Error updating category');
      throw error;
    }
  }

  // ==================== PRODUCT METHODS ====================

  static async createProduct(data: {
    name: string;
    description: string;
    sku: string;
    price: number;
    costPrice?: number;
    stock: number;
    sellerId: string;
    categoryId: string;
    image?: string;
  }): Promise<Product> {
    try {
      const product = await prisma.product.create({
        data: {
          ...data,
          status: 'ACTIVE',
        },
      });
      logger.info({ productId: product.id }, 'Product created');
      return product;
    } catch (error) {
      logger.error(error, 'Error creating product');
      throw error;
    }
  }

  static async findProductById(id: string): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Error finding product');
      throw error;
    }
  }

  static async findProductBySku(sku: string): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { sku },
      });
    } catch (error) {
      logger.error(error, 'Error finding product by SKU');
      throw error;
    }
  }

  static async listProducts(filters?: {
    categoryId?: string;
    sellerId?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (filters?.categoryId) where.categoryId = filters.categoryId;
      if (filters?.sellerId) where.sellerId = filters.sellerId;
      if (filters?.status) where.status = filters.status;

      const orderBy: any = {};
      switch (filters?.sort) {
        case 'price':
          orderBy.price = 'asc';
          break;
        case 'rating':
          orderBy.rating = 'desc';
          break;
        case 'createdAt':
          orderBy.createdAt = 'desc';
          break;
        default:
          orderBy.name = 'asc';
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return { products, total };
    } catch (error) {
      logger.error(error, 'Error listing products');
      throw error;
    }
  }

  static async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data,
      });
      logger.info({ productId: id }, 'Product updated');
      return product;
    } catch (error) {
      logger.error(error, 'Error updating product');
      throw error;
    }
  }

  static async updateStock(id: string, quantity: number): Promise<Product> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { stock: { increment: quantity } },
      });
      logger.info({ productId: id, quantity }, 'Product stock updated');
      return product;
    } catch (error) {
      logger.error(error, 'Error updating product stock');
      throw error;
    }
  }

  static async updateRating(id: string, rating: number, count: number): Promise<Product> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { rating, ratingCount: count },
      });
      return product;
    } catch (error) {
      logger.error(error, 'Error updating product rating');
      throw error;
    }
  }

  // ==================== REVIEW METHODS ====================

  static async createReview(data: {
    productId: string;
    userId: string;
    rating: number;
    title: string;
    comment: string;
  }): Promise<Review> {
    try {
      const review = await prisma.review.create({
        data: {
          ...data,
          status: 'PENDING',
        },
      });
      logger.info({ reviewId: review.id }, 'Review created');
      return review;
    } catch (error) {
      logger.error(error, 'Error creating review');
      throw error;
    }
  }

  static async findReviewById(id: string): Promise<Review | null> {
    try {
      return await prisma.review.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Error finding review');
      throw error;
    }
  }

  static async findReviewByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    try {
      return await prisma.review.findFirst({
        where: { userId, productId },
      });
    } catch (error) {
      logger.error(error, 'Error finding review');
      throw error;
    }
  }

  static async listProductReviews(productId: string, status?: string): Promise<Review[]> {
    try {
      return await prisma.review.findMany({
        where: {
          productId,
          ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(error, 'Error listing reviews');
      throw error;
    }
  }

  static async updateReview(id: string, data: Partial<Review>): Promise<Review> {
    try {
      const review = await prisma.review.update({
        where: { id },
        data,
      });
      logger.info({ reviewId: id }, 'Review updated');
      return review;
    } catch (error) {
      logger.error(error, 'Error updating review');
      throw error;
    }
  }

  static async approveReview(id: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
    } catch (error) {
      logger.error(error, 'Error approving review');
      throw error;
    }
  }

  static async incrementReviewHelpful(id: string): Promise<Review> {
    try {
      return await prisma.review.update({
        where: { id },
        data: { helpful: { increment: 1 } },
      });
    } catch (error) {
      logger.error(error, 'Error incrementing helpful count');
      throw error;
    }
  }

  // ==================== PROMOTION METHODS ====================

  static async createPromotion(data: {
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
      const promotion = await prisma.promotion.create({
        data,
      });
      logger.info({ promotionId: promotion.id }, 'Promotion created');
      return promotion;
    } catch (error) {
      logger.error(error, 'Error creating promotion');
      throw error;
    }
  }

  static async findPromotionById(id: string): Promise<Promotion | null> {
    try {
      return await prisma.promotion.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Error finding promotion');
      throw error;
    }
  }

  static async listProductPromotions(productId: string, activeOnly?: boolean): Promise<Promotion[]> {
    try {
      return await prisma.promotion.findMany({
        where: {
          productId,
          ...(activeOnly && { active: true }),
        },
        orderBy: { startDate: 'desc' },
      });
    } catch (error) {
      logger.error(error, 'Error listing promotions');
      throw error;
    }
  }

  static async updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion> {
    try {
      const promotion = await prisma.promotion.update({
        where: { id },
        data,
      });
      logger.info({ promotionId: id }, 'Promotion updated');
      return promotion;
    } catch (error) {
      logger.error(error, 'Error updating promotion');
      throw error;
    }
  }

  static async incrementPromotionUsage(id: string): Promise<Promotion> {
    try {
      return await prisma.promotion.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      });
    } catch (error) {
      logger.error(error, 'Error incrementing promotion usage');
      throw error;
    }
  }
}
