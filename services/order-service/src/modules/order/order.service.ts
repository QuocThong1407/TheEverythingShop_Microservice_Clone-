import { logger } from '@teleshop/common/middleware';
import { RabbitMQService } from '@teleshop/common/rabbitmq';
import OrderRepository from './order.repository';
import type { Order, OrderItem, Return } from '@prisma/client';

export class OrderService {
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  }

  private generateReturnNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `RET-${timestamp}-${random}`;
  }

  private calculateOrderTotal(
    items: Array<{ unitPrice: number; discount: number; quantity: number }>,
    shippingCost: number = 0,
    tax: number = 0
  ): { subtotal: number; total: number } {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.unitPrice - item.discount) * item.quantity;
    }, 0);

    const total = subtotal + shippingCost + tax;
    return { subtotal, total };
  }

  private async publishOrderEvent(
    eventType: string,
    aggregateId: string,
    data: any
  ): Promise<void> {
    try {
      const rabbitmq = RabbitMQService.getInstance();
      if (rabbitmq.isConnected()) {
        await rabbitmq.publish(eventType, {
          id: `${eventType}-${Date.now()}-${Math.random()}`,
          type: eventType,
          aggregateId,
          data,
          timestamp: new Date(),
        });
        logger.info(`Published event: ${eventType} for order ${aggregateId}`);
      }
    } catch (error) {
      logger.error(`Failed to publish event ${eventType}:`, error);
    }
  }

  // ============ ORDER OPERATIONS ============

  async createOrder(userId: string, orderData: {
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    shippingAddress: any;
    billingAddress?: any;
    shippingCost?: number;
    tax?: number;
    notes?: string;
  }): Promise<Order & { items: OrderItem[] }> {
    const { subtotal, total } = this.calculateOrderTotal(
      orderData.items,
      orderData.shippingCost || 0,
      orderData.tax || 0
    );

    const orderNumber = this.generateOrderNumber();

    const order = await OrderRepository.createOrder({
      orderNumber,
      userId,
      items: orderData.items.map((item) => ({
        ...item,
        discount: item.discount || 0,
      })),
      shippingAddress: orderData.shippingAddress,
      billingAddress: orderData.billingAddress,
      shippingCost: orderData.shippingCost || 0,
      tax: orderData.tax || 0,
      subtotal,
      total,
      notes: orderData.notes,
    });

    // Publish ORDER_CREATED event for Catalog Service (inventory reservation)
    await this.publishOrderEvent('ORDER_CREATED', order.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total: order.total,
    });

    logger.info(`Order created: ${order.orderNumber} for user ${userId}`);
    return order;
  }

  async getOrder(orderId: string): Promise<(Order & { items: OrderItem[] }) | null> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getUserOrders(
    userId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ): Promise<{
    orders: (Order & { items: OrderItem[] })[];
    total: number;
  }> {
    return OrderRepository.findOrdersByUserId(userId, filters);
  }

  async confirmOrder(orderId: string): Promise<Order> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Cannot confirm order with status ${order.status}`);
    }

    const updated = await OrderRepository.updateOrderStatus(orderId, 'CONFIRMED');
    
    // Publish ORDER_CONFIRMED event for Payment Service
    await this.publishOrderEvent('ORDER_CONFIRMED', orderId, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.userId,
      total: order.total,
    });

    logger.info(`Order confirmed: ${order.orderNumber}`);
    return updated;
  }

  async shipOrder(orderId: string): Promise<Order> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'CONFIRMED') {
      throw new Error(`Cannot ship order with status ${order.status}`);
    }

    const updated = await OrderRepository.updateOrderStatus(orderId, 'SHIPPED');
    
    // Publish ORDER_SHIPPED event
    await this.publishOrderEvent('ORDER_SHIPPED', orderId, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.userId,
    });

    logger.info(`Order shipped: ${order.orderNumber}`);
    return updated;
  }

  async deliverOrder(orderId: string): Promise<Order> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'SHIPPED') {
      throw new Error(`Cannot deliver order with status ${order.status}`);
    }

    const updated = await OrderRepository.updateOrderStatus(orderId, 'DELIVERED');
    
    // Publish ORDER_DELIVERED event for Account Service (update stats)
    await this.publishOrderEvent('ORDER_DELIVERED', orderId, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.userId,
      total: order.total,
    });

    logger.info(`Order delivered: ${order.orderNumber}`);
    return updated;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status ${order.status}`);
    }

    const updated = await OrderRepository.cancelOrder(orderId);
    
    // Publish ORDER_CANCELLED event for Catalog Service (restore inventory)
    await this.publishOrderEvent('ORDER_CANCELLED', orderId, {
      orderId,
      orderNumber: order.orderNumber,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    logger.info(`Order cancelled: ${order.orderNumber}`);
    return updated;
  }

  // ============ RETURN OPERATIONS ============

  async requestReturn(
    orderId: string,
    returnData: {
      items: string[];
      reason: string;
      refundAmount?: number;
    }
  ): Promise<Return> {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'DELIVERED') {
      throw new Error(`Cannot request return for order with status ${order.status}`);
    }

    // Verify items exist in order
    const orderProductIds = order.items.map((item) => item.productId);
    const invalidItems = returnData.items.filter((id) => !orderProductIds.includes(id));
    if (invalidItems.length > 0) {
      throw new Error(`Invalid product IDs for return: ${invalidItems.join(', ')}`);
    }

    // Calculate refund amount if not provided
    let refundAmount = returnData.refundAmount || 0;
    if (!returnData.refundAmount) {
      refundAmount = order.items
        .filter((item) => returnData.items.includes(item.productId))
        .reduce((sum, item) => sum + item.subtotal, 0);
    }

    const returnNumber = this.generateReturnNumber();
    const createdReturn = await OrderRepository.createReturn({
      orderId,
      returnNumber,
      items: returnData.items,
      reason: returnData.reason,
      refundAmount,
    });

    // Publish RETURN_REQUESTED event
    await this.publishOrderEvent('RETURN_REQUESTED', createdReturn.id, {
      returnId: createdReturn.id,
      returnNumber: createdReturn.returnNumber,
      orderId,
      userId: order.userId,
      items: returnData.items,
      refundAmount,
    });

    logger.info(`Return requested: ${returnNumber} for order ${order.orderNumber}`);
    return createdReturn;
  }

  async approveReturn(returnId: string, refundAmount: number, notes?: string): Promise<Return> {
    const ret = await OrderRepository.findReturnById(returnId);
    if (!ret) {
      throw new Error('Return not found');
    }

    if (ret.status !== 'PENDING') {
      throw new Error(`Cannot approve return with status ${ret.status}`);
    }

    const approved = await OrderRepository.approveReturn(returnId, refundAmount, notes);
    
    // Publish RETURN_APPROVED event
    await this.publishOrderEvent('RETURN_APPROVED', returnId, {
      returnId,
      returnNumber: ret.returnNumber,
      orderId: ret.orderId,
      refundAmount,
    });

    logger.info(`Return approved: ${ret.returnNumber}`);
    return approved;
  }

  async completeReturn(returnId: string): Promise<Return> {
    const ret = await OrderRepository.findReturnById(returnId);
    if (!ret) {
      throw new Error('Return not found');
    }

    if (ret.status !== 'APPROVED') {
      throw new Error(`Cannot complete return with status ${ret.status}`);
    }

    const completed = await OrderRepository.completeReturn(returnId);
    
    // Publish RETURN_COMPLETED event for Payment Service (process refund)
    await this.publishOrderEvent('RETURN_COMPLETED', returnId, {
      returnId,
      returnNumber: ret.returnNumber,
      orderId: ret.orderId,
      refundAmount: ret.refundAmount,
    });

    logger.info(`Return completed: ${ret.returnNumber}`);
    return completed;
  }

  async getReturn(returnId: string): Promise<Return | null> {
    return OrderRepository.findReturnById(returnId);
  }

  async getOrderReturns(orderId: string): Promise<Return[]> {
    return OrderRepository.findReturnsByOrderId(orderId);
  }

  // ============ STATISTICS ============

  async getUserOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    totalItems: number;
  }> {
    return OrderRepository.getOrderStats(userId);
  }
}

export default new OrderService();
