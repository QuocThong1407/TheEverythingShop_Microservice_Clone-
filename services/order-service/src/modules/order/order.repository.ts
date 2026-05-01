import { PrismaClient } from '@prisma/client';
import type { Order, OrderItem, Return } from '@prisma/client';

const prisma = new PrismaClient();

export class OrderRepository {
  // ============ ORDER OPERATIONS ============

  async createOrder(data: {
    orderNumber: string;
    userId: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      discount: number;
    }>;
    shippingAddress: any;
    billingAddress?: any;
    shippingCost: number;
    tax: number;
    subtotal: number;
    total: number;
    notes?: string;
  }): Promise<Order & { items: OrderItem[] }> {
    const order = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: data.userId,
        items: {
          createMany: {
            data: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              subtotal: (item.unitPrice - item.discount) * item.quantity,
            })),
          },
        },
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress || data.shippingAddress,
        shippingCost: data.shippingCost,
        tax: data.tax,
        subtotal: data.subtotal,
        total: data.total,
        notes: data.notes,
      },
      include: {
        items: true,
      },
    });

    return order;
  }

  async findOrderById(orderId: string): Promise<(Order & { items: OrderItem[] }) | null> {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });
  }

  async findOrderByNumber(orderNumber: string): Promise<(Order & { items: OrderItem[] }) | null> {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
      },
    });
  }

  async findOrdersByUserId(
    userId: string,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    orders: (Order & { items: OrderItem[] })[];
    total: number;
  }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }

  async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: paymentStatus as any },
    });
  }

  async cancelOrder(orderId: string): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }

  // ============ ORDER ITEM OPERATIONS ============

  async findOrderItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return prisma.orderItem.findMany({
      where: { orderId },
    });
  }

  async findOrderItemByProductInOrder(
    orderId: string,
    productId: string
  ): Promise<OrderItem | null> {
    return prisma.orderItem.findUnique({
      where: {
        orderId_productId: { orderId, productId },
      },
    });
  }

  // ============ RETURN OPERATIONS ============

  async createReturn(data: {
    orderId: string;
    returnNumber: string;
    items: string[];
    reason: string;
    refundAmount: number;
    notes?: string;
  }): Promise<Return> {
    return prisma.return.create({
      data: {
        orderId: data.orderId,
        returnNumber: data.returnNumber,
        items: data.items,
        reason: data.reason,
        refundAmount: data.refundAmount,
        notes: data.notes,
      },
    });
  }

  async findReturnById(returnId: string): Promise<Return | null> {
    return prisma.return.findUnique({
      where: { id: returnId },
    });
  }

  async findReturnByNumber(returnNumber: string): Promise<Return | null> {
    return prisma.return.findUnique({
      where: { returnNumber },
    });
  }

  async findReturnsByOrderId(orderId: string): Promise<Return[]> {
    return prisma.return.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReturnStatus(returnId: string, status: string): Promise<Return> {
    return prisma.return.update({
      where: { id: returnId },
      data: { status: status as any },
    });
  }

  async approveReturn(returnId: string, refundAmount: number, notes?: string): Promise<Return> {
    return prisma.return.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        refundAmount,
        notes,
      },
    });
  }

  async completeReturn(returnId: string): Promise<Return> {
    return prisma.return.update({
      where: { id: returnId },
      data: { status: 'COMPLETED' },
    });
  }

  // ============ STATISTICS ============

  async getOrderStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    totalItems: number;
  }> {
    const stats = await prisma.order.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { total: true, subtotal: true },
    });

    const itemStats = await prisma.orderItem.aggregate({
      where: { order: { userId } },
      _sum: { quantity: true },
    });

    return {
      totalOrders: stats._count.id,
      totalSpent: stats._sum.total || 0,
      totalItems: itemStats._sum.quantity || 0,
    };
  }

  async getOrdersByStatus(status: string, limit?: number): Promise<Order[]> {
    return prisma.order.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export default new OrderRepository();
