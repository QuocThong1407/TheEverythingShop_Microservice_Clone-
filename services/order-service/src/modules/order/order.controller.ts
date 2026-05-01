import { Request, Response } from 'express';
import { logger } from '@teleshop/common/middleware';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '@teleshop/common/errors';
import OrderService from './order.service';

export class OrderController {
  // ============ ORDER ENDPOINTS ============

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        throw new BadRequestError('User ID required');
      }

      const order = await OrderService.createOrder(userId, req.body);

      res.status(201).json({
        message: 'Order created successfully',
        order,
      });
    } catch (error: any) {
      logger.error('Create order error:', error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message, statusCode: 400 });
      } else {
        res.status(500).json({ message: 'Failed to create order', statusCode: 500 });
      }
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.currentUser?.id;

      const order = await OrderService.getOrder(orderId);

      // Verify user ownership
      if (order.userId !== userId && req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      res.status(200).json({
        message: 'Order retrieved successfully',
        order,
      });
    } catch (error: any) {
      logger.error('Get order error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(500).json({ message: 'Failed to get order', statusCode: 500 });
      }
    }
  }

  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        throw new BadRequestError('User ID required');
      }

      const { status, page, limit } = req.query;
      const { orders, total } = await OrderService.getUserOrders(userId, {
        status: status as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? Math.min(parseInt(limit as string), 100) : 20,
      });

      res.status(200).json({
        message: 'Orders retrieved successfully',
        orders,
        total,
        page: page ? parseInt(page as string) : 1,
        pages: Math.ceil(total / (limit ? Math.min(parseInt(limit as string), 100) : 20)),
      });
    } catch (error: any) {
      logger.error('Get user orders error:', error);
      res.status(500).json({ message: 'Failed to get orders', statusCode: 500 });
    }
  }

  async confirmOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.currentUser?.id;

      // Verify user ownership or admin
      const order = await OrderService.getOrder(orderId);
      if (order.userId !== userId && req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const updated = await OrderService.confirmOrder(orderId);

      res.status(200).json({
        message: 'Order confirmed successfully',
        order: updated,
      });
    } catch (error: any) {
      logger.error('Confirm order error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  async shipOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Only admin can ship orders
      if (req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const updated = await OrderService.shipOrder(orderId);

      res.status(200).json({
        message: 'Order shipped successfully',
        order: updated,
      });
    } catch (error: any) {
      logger.error('Ship order error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  async deliverOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Only admin can deliver orders
      if (req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const updated = await OrderService.deliverOrder(orderId);

      res.status(200).json({
        message: 'Order delivered successfully',
        order: updated,
      });
    } catch (error: any) {
      logger.error('Deliver order error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.currentUser?.id;

      // Verify user ownership or admin
      const order = await OrderService.getOrder(orderId);
      if (order.userId !== userId && req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const updated = await OrderService.cancelOrder(orderId);

      res.status(200).json({
        message: 'Order cancelled successfully',
        order: updated,
      });
    } catch (error: any) {
      logger.error('Cancel order error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  // ============ RETURN ENDPOINTS ============

  async requestReturn(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.currentUser?.id;

      // Verify user ownership
      const order = await OrderService.getOrder(orderId);
      if (order.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const ret = await OrderService.requestReturn(orderId, req.body);

      res.status(201).json({
        message: 'Return requested successfully',
        return: ret,
      });
    } catch (error: any) {
      logger.error('Request return error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  async getOrderReturns(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.currentUser?.id;

      // Verify user ownership or admin
      const order = await OrderService.getOrder(orderId);
      if (order.userId !== userId && req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const returns = await OrderService.getOrderReturns(orderId);

      res.status(200).json({
        message: 'Returns retrieved successfully',
        returns,
      });
    } catch (error: any) {
      logger.error('Get returns error:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ message: 'Order not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(500).json({ message: 'Failed to get returns', statusCode: 500 });
      }
    }
  }

  async getReturn(req: Request, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;

      const ret = await OrderService.getReturn(returnId);
      if (!ret) {
        res.status(404).json({ message: 'Return not found', statusCode: 404 });
        return;
      }

      res.status(200).json({
        message: 'Return retrieved successfully',
        return: ret,
      });
    } catch (error: any) {
      logger.error('Get return error:', error);
      res.status(500).json({ message: 'Failed to get return', statusCode: 500 });
    }
  }

  async approveReturn(req: Request, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;

      // Only admin can approve returns
      if (req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const { refundAmount, notes } = req.body;
      const approved = await OrderService.approveReturn(returnId, refundAmount, notes);

      res.status(200).json({
        message: 'Return approved successfully',
        return: approved,
      });
    } catch (error: any) {
      logger.error('Approve return error:', error);
      if (error.message === 'Return not found') {
        res.status(404).json({ message: 'Return not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  async completeReturn(req: Request, res: Response): Promise<void> {
    try {
      const { returnId } = req.params;

      // Only admin can complete returns
      if (req.currentUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const completed = await OrderService.completeReturn(returnId);

      res.status(200).json({
        message: 'Return completed successfully',
        return: completed,
      });
    } catch (error: any) {
      logger.error('Complete return error:', error);
      if (error.message === 'Return not found') {
        res.status(404).json({ message: 'Return not found', statusCode: 404 });
      } else if (error.message === 'Unauthorized') {
        res.status(403).json({ message: 'Forbidden', statusCode: 403 });
      } else {
        res.status(400).json({ message: error.message, statusCode: 400 });
      }
    }
  }

  // ============ STATISTICS ============

  async getUserOrderStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id;
      if (!userId) {
        throw new BadRequestError('User ID required');
      }

      const stats = await OrderService.getUserOrderStats(userId);

      res.status(200).json({
        message: 'Order statistics retrieved successfully',
        stats,
      });
    } catch (error: any) {
      logger.error('Get order stats error:', error);
      res.status(500).json({ message: 'Failed to get order statistics', statusCode: 500 });
    }
  }
}

export default new OrderController();
