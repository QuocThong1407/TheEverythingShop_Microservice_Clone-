import { prisma } from '../config/database.js'
import { Payment, Refund, PaymentStatus, RefundStatus } from '@prisma/client'

export class PaymentRepository {
  async create(data: {
    orderId: string
    userId: string
    amount: number
    currency: string
    paymentMethod: string
    metadata?: any
  }): Promise<Payment> {
    return prisma.payment.create({
      data: {
        ...data,
        amount: data.amount.toString(),
      },
    })
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
    })
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { orderId },
    })
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { transactionId },
    })
  }

  async findByUserId(userId: string, skip: number = 0, take: number = 10): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async findMany(where: any, skip: number = 0, take: number = 10): Promise<Payment[]> {
    return prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async update(id: string, data: Partial<Payment>): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        ...data,
        amount: data.amount ? data.amount.toString() : undefined,
      },
    })
  }

  async updateStatus(id: string, status: PaymentStatus, gatewayResponse?: any): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
        gatewayResponse,
        updatedAt: new Date(),
      },
    })
  }

  async updateTransactionId(id: string, transactionId: string, gatewayResponse?: any): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        transactionId,
        gatewayResponse,
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string): Promise<Payment> {
    return prisma.payment.delete({
      where: { id },
    })
  }

  async count(where?: any): Promise<number> {
    return prisma.payment.count({ where })
  }
}

export class RefundRepository {
  async create(data: {
    paymentId: string
    orderId: string
    userId: string
    amount: number
    reason: string
    metadata?: any
  }): Promise<Refund> {
    return prisma.refund.create({
      data: {
        ...data,
        amount: data.amount.toString(),
      },
    })
  }

  async findById(id: string): Promise<Refund | null> {
    return prisma.refund.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    })
  }

  async findByPaymentId(paymentId: string): Promise<Refund[]> {
    return prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByOrderId(orderId: string): Promise<Refund[]> {
    return prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUserId(userId: string, skip: number = 0, take: number = 10): Promise<Refund[]> {
    return prisma.refund.findMany({
      where: { userId },
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async findMany(where: any, skip: number = 0, take: number = 10): Promise<Refund[]> {
    return prisma.refund.findMany({
      where,
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  async update(id: string, data: Partial<Refund>): Promise<Refund> {
    return prisma.refund.update({
      where: { id },
      data: {
        ...data,
        amount: data.amount ? data.amount.toString() : undefined,
      },
    })
  }

  async updateStatus(id: string, status: RefundStatus, gatewayResponse?: any): Promise<Refund> {
    return prisma.refund.update({
      where: { id },
      data: {
        status,
        gatewayResponse,
        updatedAt: new Date(),
      },
    })
  }

  async updateRefundTransactionId(
    id: string,
    refundTransactionId: string,
    gatewayResponse?: any
  ): Promise<Refund> {
    return prisma.refund.update({
      where: { id },
      data: {
        refundTransactionId,
        gatewayResponse,
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string): Promise<Refund> {
    return prisma.refund.delete({
      where: { id },
    })
  }

  async count(where?: any): Promise<number> {
    return prisma.refund.count({ where })
  }
}
