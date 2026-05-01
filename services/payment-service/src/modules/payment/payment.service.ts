import { Payment, Refund, PaymentStatus, RefundStatus } from '@prisma/client'
import { PaymentRepository, RefundRepository } from './payment.repository.js'
import { PaymentGatewayFactory, PaymentRequest } from './payment.gateway.js'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import logger from '@teleshop/common/logger'
import { BadRequestError, NotFoundError, ConflictError } from '@teleshop/common/errors'

export class PaymentService {
  private paymentRepo: PaymentRepository
  private rabbit: RabbitMQService

  constructor(rabbit: RabbitMQService) {
    this.paymentRepo = new PaymentRepository()
    this.rabbit = rabbit
  }

  /**
   * Create payment and initiate with gateway
   */
  async createPayment(data: {
    orderId: string
    userId: string
    amount: number
    currency: string
    paymentMethod: string
    metadata?: any
  }): Promise<{ payment: Payment; paymentUrl?: string }> {
    // Check if payment already exists for order
    const existing = await this.paymentRepo.findByOrderId(data.orderId)
    if (existing) {
      throw new ConflictError(`Payment already exists for order ${data.orderId}`)
    }

    // Create payment record
    const payment = await this.paymentRepo.create({
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      metadata: data.metadata,
    })

    // Publish PAYMENT_INITIATED event
    await this.rabbit.publish('PAYMENT_INITIATED', {
      paymentId: payment.id,
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
    })

    // Get payment gateway and initiate
    const gateway = PaymentGatewayFactory.create(data.paymentMethod)
    const gatewayResponse = await gateway.initiate({
      orderId: data.orderId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
    })

    if (!gatewayResponse.success) {
      // Update payment to failed
      await this.paymentRepo.updateStatus(payment.id, PaymentStatus.FAILED, gatewayResponse.gatewayResponse)
      throw new BadRequestError(gatewayResponse.message)
    }

    logger.info(`Payment created: ${payment.id} for order ${data.orderId}`)

    return {
      payment,
      paymentUrl: gatewayResponse.paymentUrl,
    }
  }

  /**
   * Confirm payment with transaction ID
   */
  async confirmPayment(
    paymentId: string,
    transactionId: string,
    gatewayResponse?: any
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictError(`Cannot confirm payment with status ${payment.status}`)
    }

    const updated = await this.paymentRepo.updateTransactionId(
      paymentId,
      transactionId,
      gatewayResponse
    )

    await this.paymentRepo.updateStatus(paymentId, PaymentStatus.AUTHORIZED, gatewayResponse)

    logger.info(`Payment confirmed: ${paymentId} with transaction ${transactionId}`)

    return updated
  }

  /**
   * Verify payment via webhook callback
   */
  async verifyPayment(
    orderId: string,
    transactionId: string,
    status: string,
    gatewayResponse: any
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findByOrderId(orderId)
    if (!payment) {
      throw new NotFoundError('Payment not found for order')
    }

    // Verify with gateway
    const gateway = PaymentGatewayFactory.create(payment.paymentMethod)
    const verifyResult = await gateway.verify(transactionId, gatewayResponse)

    if (!verifyResult.success) {
      await this.paymentRepo.updateStatus(payment.id, PaymentStatus.FAILED, gatewayResponse)

      // Publish PAYMENT_FAILED event
      await this.rabbit.publish('PAYMENT_FAILED', {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: Number(payment.amount),
        reason: 'Payment verification failed',
      })

      throw new BadRequestError('Payment verification failed')
    }

    // Update payment to completed
    const updated = await this.paymentRepo.updateStatus(
      payment.id,
      PaymentStatus.COMPLETED,
      gatewayResponse
    )

    // Publish PAYMENT_SUCCESS event
    await this.rabbit.publish('PAYMENT_SUCCESS', {
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: Number(payment.amount),
      transactionId,
    })

    logger.info(`Payment verified: ${payment.id} - status ${verifyResult.status}`)

    return updated
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) {
      throw new NotFoundError('Payment not found')
    }
    return payment
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findByOrderId(orderId)
    if (!payment) {
      throw new NotFoundError('Payment not found for order')
    }
    return payment
  }

  /**
   * List payments
   */
  async listPayments(filters: any, skip: number = 0, take: number = 10): Promise<{ payments: Payment[]; total: number }> {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.orderId) where.orderId = filters.orderId
    if (filters.status) where.status = filters.status

    const [payments, total] = await Promise.all([
      this.paymentRepo.findMany(where, skip, take),
      this.paymentRepo.count(where),
    ])

    return { payments, total }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    if (![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(payment.status)) {
      throw new ConflictError(`Cannot cancel payment with status ${payment.status}`)
    }

    const updated = await this.paymentRepo.updateStatus(paymentId, PaymentStatus.CANCELLED)

    logger.info(`Payment cancelled: ${paymentId}`)

    return updated
  }
}

export class RefundService {
  private refundRepo: RefundRepository
  private paymentRepo: PaymentRepository
  private rabbit: RabbitMQService

  constructor(rabbit: RabbitMQService) {
    this.refundRepo = new RefundRepository()
    this.paymentRepo = new PaymentRepository()
    this.rabbit = rabbit
  }

  /**
   * Initiate refund
   */
  async initiateRefund(
    paymentId: string,
    amount: number,
    reason: string,
    metadata?: any
  ): Promise<Refund> {
    const payment = await this.paymentRepo.findById(paymentId)
    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ConflictError('Only completed payments can be refunded')
    }

    if (amount > Number(payment.amount)) {
      throw new BadRequestError('Refund amount cannot exceed payment amount')
    }

    // Check if refund already exists for this amount
    const existingRefunds = await this.refundRepo.findByPaymentId(paymentId)
    const refundedAmount = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0)

    if (refundedAmount + amount > Number(payment.amount)) {
      throw new ConflictError('Total refund amount exceeds payment amount')
    }

    // Create refund record
    const refund = await this.refundRepo.create({
      paymentId,
      orderId: payment.orderId,
      userId: payment.userId,
      amount,
      reason,
      metadata,
    })

    // Publish REFUND_INITIATED event
    await this.rabbit.publish('REFUND_INITIATED', {
      refundId: refund.id,
      paymentId,
      orderId: payment.orderId,
      userId: payment.userId,
      amount,
      reason,
    })

    logger.info(`Refund initiated: ${refund.id} for payment ${paymentId}`)

    return refund
  }

  /**
   * Confirm refund with transaction ID
   */
  async confirmRefund(
    refundId: string,
    refundTransactionId: string,
    status: 'COMPLETED' | 'FAILED',
    gatewayResponse?: any
  ): Promise<Refund> {
    const refund = await this.refundRepo.findById(refundId)
    if (!refund) {
      throw new NotFoundError('Refund not found')
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new ConflictError(`Cannot confirm refund with status ${refund.status}`)
    }

    const refundStatus = status === 'COMPLETED' ? RefundStatus.COMPLETED : RefundStatus.FAILED

    const updated = await this.refundRepo.updateRefundTransactionId(
      refundId,
      refundTransactionId,
      gatewayResponse
    )

    await this.refundRepo.updateStatus(refundId, refundStatus, gatewayResponse)

    // Publish event
    if (status === 'COMPLETED') {
      await this.rabbit.publish('REFUND_COMPLETED', {
        refundId,
        paymentId: refund.paymentId,
        orderId: refund.orderId,
        userId: refund.userId,
        amount: Number(refund.amount),
      })
    } else {
      await this.rabbit.publish('REFUND_FAILED', {
        refundId,
        paymentId: refund.paymentId,
        orderId: refund.orderId,
        reason: 'Refund processing failed',
      })
    }

    logger.info(`Refund confirmed: ${refundId} - status ${status}`)

    return updated
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<Refund> {
    const refund = await this.refundRepo.findById(refundId)
    if (!refund) {
      throw new NotFoundError('Refund not found')
    }
    return refund
  }

  /**
   * List refunds
   */
  async listRefunds(filters: any, skip: number = 0, take: number = 10): Promise<{ refunds: Refund[]; total: number }> {
    const where: any = {}

    if (filters.paymentId) where.paymentId = filters.paymentId
    if (filters.orderId) where.orderId = filters.orderId
    if (filters.status) where.status = filters.status

    const [refunds, total] = await Promise.all([
      this.refundRepo.findMany(where, skip, take),
      this.refundRepo.count(where),
    ])

    return { refunds, total }
  }

  /**
   * Get refunds by payment
   */
  async getRefundsByPayment(paymentId: string): Promise<Refund[]> {
    return this.refundRepo.findByPaymentId(paymentId)
  }
}
