import { Request, Response } from 'express';
import { logger } from '@teleshop/common/middleware';
import CartService from './cart.service';

export class CartController {
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const cart = await CartService.getCart(userId);

      res.status(200).json({
        message: 'Cart retrieved successfully',
        cart,
      });
    } catch (error: any) {
      logger.error('Get cart error:', error);
      res.status(500).json({ message: 'Failed to get cart', statusCode: 500 });
    }
  }

  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const cart = await CartService.addToCart(userId, req.body);

      res.status(201).json({
        message: 'Item added to cart successfully',
        cart,
      });
    } catch (error: any) {
      logger.error('Add to cart error:', error);
      res
        .status(500)
        .json({ message: 'Failed to add to cart', statusCode: 500 });
    }
  }

  async updateCartItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const { itemId } = req.params;
      const { quantity } = req.body;

      const cart = await CartService.updateCartItem(userId, itemId, quantity);

      res.status(200).json({
        message: 'Cart item updated successfully',
        cart,
      });
    } catch (error: any) {
      logger.error('Update cart item error:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message, statusCode: 404 });
      } else {
        res
          .status(500)
          .json({ message: 'Failed to update cart item', statusCode: 500 });
      }
    }
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const { itemId } = req.params;

      const cart = await CartService.removeFromCart(userId, itemId);

      res.status(200).json({
        message: 'Item removed from cart successfully',
        cart,
      });
    } catch (error: any) {
      logger.error('Remove from cart error:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ message: error.message, statusCode: 404 });
      } else {
        res.status(500).json({
          message: 'Failed to remove from cart',
          statusCode: 500,
        });
      }
    }
  }

  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      await CartService.clearCart(userId);

      res.status(200).json({
        message: 'Cart cleared successfully',
      });
    } catch (error: any) {
      logger.error('Clear cart error:', error);
      res.status(500).json({ message: 'Failed to clear cart', statusCode: 500 });
    }
  }

  async checkout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const result = await CartService.checkout(userId, req.body);

      res.status(200).json({
        message: 'Checkout successful',
        orderId: result.orderId,
        items: result.items,
        total: result.total,
      });
    } catch (error: any) {
      logger.error('Checkout error:', error);
      if (error.message === 'Cart is empty') {
        res.status(400).json({ message: 'Cart is empty', statusCode: 400 });
      } else {
        res.status(500).json({ message: 'Checkout failed', statusCode: 500 });
      }
    }
  }

  async getCartStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
        return;
      }

      const stats = await CartService.getCartStats(userId);

      res.status(200).json({
        message: 'Cart statistics retrieved successfully',
        stats,
      });
    } catch (error: any) {
      logger.error('Get cart stats error:', error);
      res.status(500).json({
        message: 'Failed to get cart statistics',
        statusCode: 500,
      });
    }
  }

  async getUserCarts(req: Request, res: Response): Promise<void> {
    try {
      // Only admin can view all carts
      if (req.currentUser?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
        return;
      }

      const carts = await CartService.getUserCarts();

      res.status(200).json({
        message: 'User carts retrieved successfully',
        carts,
      });
    } catch (error: any) {
      logger.error('Get user carts error:', error);
      res
        .status(500)
        .json({ message: 'Failed to get user carts', statusCode: 500 });
    }
  }

  async deleteUserCart(req: Request, res: Response): Promise<void> {
    try {
      // Only admin can delete carts
      if (req.currentUser?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
        return;
      }

      const { userId } = req.params;
      await CartService.deleteUserCart(userId);

      res.status(200).json({
        message: 'Cart deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete user cart error:', error);
      res
        .status(500)
        .json({ message: 'Failed to delete cart', statusCode: 500 });
    }
  }
}

export default new CartController();
