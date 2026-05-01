import { redis } from '../../config/redis';
import { logger } from '@teleshop/common/middleware';
import { RabbitMQService } from '@teleshop/common/rabbitmq';
import { v4 as uuidv4 } from 'uuid';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  image?: string;
  selectedVariants?: Record<string, string>;
  addedAt: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

const CART_KEY_PREFIX = 'cart:';
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class CartService {
  private getCartKey(userId: string): string {
    return `${CART_KEY_PREFIX}${userId}`;
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // ============ CART OPERATIONS ============

  async getCart(userId: string): Promise<Cart> {
    try {
      const cartKey = this.getCartKey(userId);
      const cartData = await redis.get(cartKey);

      if (!cartData) {
        return {
          userId,
          items: [],
          subtotal: 0,
          itemCount: 0,
        };
      }

      const items: CartItem[] = JSON.parse(cartData);
      const subtotal = this.calculateSubtotal(items);

      return {
        userId,
        items,
        subtotal,
        itemCount: items.length,
      };
    } catch (error) {
      logger.error('Error getting cart:', error);
      throw new Error('Failed to get cart');
    }
  }

  async addToCart(
    userId: string,
    item: {
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      price: number;
      image?: string;
      selectedVariants?: Record<string, string>;
    }
  ): Promise<Cart> {
    try {
      const cartKey = this.getCartKey(userId);
      const cartData = await redis.get(cartKey);

      let items: CartItem[] = cartData ? JSON.parse(cartData) : [];

      // Check if product already in cart
      const existingItemIndex = items.findIndex(
        (i) =>
          i.productId === item.productId &&
          JSON.stringify(i.selectedVariants) ===
            JSON.stringify(item.selectedVariants)
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        const newItem: CartItem = {
          id: uuidv4(),
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          selectedVariants: item.selectedVariants,
          addedAt: new Date().toISOString(),
        };
        items.push(newItem);
      }

      // Save to Redis with TTL
      await redis.setex(cartKey, CART_TTL, JSON.stringify(items));
      logger.info(`Added item to cart for user ${userId}`);

      const subtotal = this.calculateSubtotal(items);

      return {
        userId,
        items,
        subtotal,
        itemCount: items.length,
      };
    } catch (error) {
      logger.error('Error adding to cart:', error);
      throw new Error('Failed to add to cart');
    }
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    try {
      const cartKey = this.getCartKey(userId);
      const cartData = await redis.get(cartKey);

      if (!cartData) {
        throw new Error('Cart not found');
      }

      const items: CartItem[] = JSON.parse(cartData);
      const itemIndex = items.findIndex((i) => i.id === itemId);

      if (itemIndex < 0) {
        throw new Error('Item not found in cart');
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0
        items.splice(itemIndex, 1);
      } else {
        // Update quantity
        items[itemIndex].quantity = quantity;
      }

      // Save to Redis
      if (items.length > 0) {
        await redis.setex(cartKey, CART_TTL, JSON.stringify(items));
      } else {
        // Delete cart if empty
        await redis.del(cartKey);
      }

      logger.info(`Updated item ${itemId} in cart for user ${userId}`);

      const subtotal = this.calculateSubtotal(items);

      return {
        userId,
        items,
        subtotal,
        itemCount: items.length,
      };
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeFromCart(userId: string, itemId: string): Promise<Cart> {
    try {
      const cartKey = this.getCartKey(userId);
      const cartData = await redis.get(cartKey);

      if (!cartData) {
        throw new Error('Cart not found');
      }

      let items: CartItem[] = JSON.parse(cartData);
      const initialLength = items.length;

      items = items.filter((i) => i.id !== itemId);

      if (items.length === initialLength) {
        throw new Error('Item not found in cart');
      }

      // Save to Redis or delete if empty
      if (items.length > 0) {
        await redis.setex(cartKey, CART_TTL, JSON.stringify(items));
      } else {
        await redis.del(cartKey);
      }

      logger.info(`Removed item ${itemId} from cart for user ${userId}`);

      const subtotal = this.calculateSubtotal(items);

      return {
        userId,
        items,
        subtotal,
        itemCount: items.length,
      };
    } catch (error) {
      logger.error('Error removing from cart:', error);
      throw error;
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      const cartKey = this.getCartKey(userId);
      await redis.del(cartKey);
      logger.info(`Cleared cart for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw new Error('Failed to clear cart');
    }
  }

  // ============ CHECKOUT ============

  async checkout(
    userId: string,
    checkoutData: {
      shippingAddress: any;
      billingAddress?: any;
      shippingCost?: number;
      tax?: number;
      notes?: string;
    }
  ): Promise<{
    orderId: string;
    items: CartItem[];
    total: number;
  }> {
    try {
      const cart = await this.getCart(userId);

      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Publish CART_CHECKOUT event to Order Service
      const rabbitmq = RabbitMQService.getInstance();
      const shippingCost = checkoutData.shippingCost || 0;
      const tax = checkoutData.tax || 0;
      const total = cart.subtotal + shippingCost + tax;

      await rabbitmq.publish('CART_CHECKOUT', {
        id: `CART_CHECKOUT-${Date.now()}-${Math.random()}`,
        type: 'CART_CHECKOUT',
        aggregateId: userId,
        data: {
          userId,
          items: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: 0,
          })),
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
          shippingCost,
          tax,
          notes: checkoutData.notes,
        },
        timestamp: new Date(),
      });

      logger.info(`Checkout initiated for user ${userId}`);

      // Clear cart after checkout
      await this.clearCart(userId);

      // Generate order ID
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      return {
        orderId,
        items: cart.items,
        total,
      };
    } catch (error) {
      logger.error('Error during checkout:', error);
      throw error;
    }
  }

  // ============ CART STATISTICS ============

  async getCartStats(userId: string): Promise<{
    itemCount: number;
    subtotal: number;
    uniqueProducts: number;
  }> {
    try {
      const cart = await this.getCart(userId);
      const uniqueProducts = new Set(cart.items.map((i) => i.productId)).size;

      return {
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: cart.subtotal,
        uniqueProducts,
      };
    } catch (error) {
      logger.error('Error getting cart stats:', error);
      throw new Error('Failed to get cart statistics');
    }
  }

  // ============ ADMIN OPERATIONS ============

  async getUserCarts(): Promise<Array<{ userId: string; itemCount: number }>> {
    try {
      const keys = await redis.keys(`${CART_KEY_PREFIX}*`);
      const carts = [];

      for (const key of keys) {
        const cartData = await redis.get(key);
        if (cartData) {
          const items: CartItem[] = JSON.parse(cartData);
          const userId = key.replace(CART_KEY_PREFIX, '');
          carts.push({
            userId,
            itemCount: items.length,
          });
        }
      }

      return carts;
    } catch (error) {
      logger.error('Error getting user carts:', error);
      throw new Error('Failed to get user carts');
    }
  }

  async deleteUserCart(userId: string): Promise<void> {
    try {
      const cartKey = this.getCartKey(userId);
      await redis.del(cartKey);
      logger.info(`Deleted cart for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting user cart:', error);
      throw new Error('Failed to delete user cart');
    }
  }
}

export default new CartService();
