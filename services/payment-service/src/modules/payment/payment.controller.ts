import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { PaymentService, RefundService } from './payment.service.js'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import { asyncHandler } from '@teleshop/common/middleware'
import logger from '@teleshop/common/logger'

const rabbit = RabbitMQService.getInstance()
const paymentService = new PaymentService(rabbit)
const refundService = new RefundService(rabbit)

/**
 * Create payment
 */
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { orderId, userId, amount, currency, paymentMethod, metadata } = req.body

  const { payment, paymentUrl } = await paymentService.createPayment({
    orderId,
    userId,
    amount,
    currency,
    paymentMethod,
    metadata,
  })

  logger.info(`Payment created: ${payment.id}`)

  res.status(201).json({
    message: 'Payment created successfully',
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
    },
    paymentUrl,
  })
})

/**
 * Get payment by ID
 */
export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { paymentId } = req.params
  const payment = await paymentService.getPayment(paymentId)

  res.status(200).json({
    message: 'Payment retrieved successfully',
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    },
  })
})

/**
 * Get payment by order ID
 */
export const getPaymentByOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params
  const payment = await paymentService.getPaymentByOrderId(orderId)

  res.status(200).json({
    message: 'Payment retrieved successfully',
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    },
  })
})

/**
 * List payments
 */
export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { userId, orderId, status, skip = 0, take = 10 } = req.query

  const { payments, total } = await paymentService.listPayments(
    { userId, orderId, status },
    Number(skip),
    Number(take)
  )

  res.status(200).json({
    message: 'Payments retrieved successfully',
    payments: payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      userId: p.userId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
    })),
    total,
    skip: Number(skip),
    take: Number(take),
  })
})

/**
 * Confirm payment
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { paymentId } = req.params
  const { transactionId, gatewayResponse } = req.body

  const payment = await paymentService.confirmPayment(paymentId, transactionId, gatewayResponse)

  logger.info(`Payment confirmed: ${paymentId}`)

  res.status(200).json({
    message: 'Payment confirmed successfully',
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      transactionId: payment.transactionId,
      updatedAt: payment.updatedAt,
    },
  })
})

/**
 * VNPAY callback webhook
 */
export const vnpayCallback = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { orderId, transactionId, status, gatewayResponse } = req.body

  try {
    const payment = await paymentService.verifyPayment(orderId, transactionId, status, gatewayResponse)

    logger.info(`VNPAY callback processed for payment ${payment.id}`)

    res.status(200).json({
      message: 'Webhook processed successfully',
      paymentId: payment.id,
      status: payment.status,
    })
  } catch (error) {
    logger.error(`VNPAY callback error: ${error}`)
    res.status(400).json({
      message: 'Webhook processing failed',
      error: String(error),
    })
  }
})

/**
 * Momo callback webhook
 */
export const momoCallback = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { orderId, transactionId, status, gatewayResponse } = req.body

  try {
    const payment = await paymentService.verifyPayment(orderId, transactionId, status, gatewayResponse)

    logger.info(`Momo callback processed for payment ${payment.id}`)

    res.status(200).json({
      message: 'Webhook processed successfully',
      paymentId: payment.id,
      status: payment.status,
    })
  } catch (error) {
    logger.error(`Momo callback error: ${error}`)
    res.status(400).json({
      message: 'Webhook processing failed',
      error: String(error),
    })
  }
})

/**
 * Initiate refund
 */
export const initiateRefund = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { paymentId } = req.params
  const { amount, reason, metadata } = req.body

  const refund = await refundService.initiateRefund(paymentId, amount, reason, metadata)

  logger.info(`Refund initiated: ${refund.id}`)

  res.status(201).json({
    message: 'Refund initiated successfully',
    refund: {
      id: refund.id,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt,
    },
  })
})

/**
 * Get refund by ID
 */
export const getRefund = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { refundId } = req.params
  const refund = await refundService.getRefund(refundId)

  res.status(200).json({
    message: 'Refund retrieved successfully',
    refund: {
      id: refund.id,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      userId: refund.userId,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      refundTransactionId: refund.refundTransactionId,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    },
  })
})

/**
 * List refunds
 */
export const listRefunds = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { paymentId, orderId, status, skip = 0, take = 10 } = req.query

  const { refunds, total } = await refundService.listRefunds(
    { paymentId, orderId, status },
    Number(skip),
    Number(take)
  )

  res.status(200).json({
    message: 'Refunds retrieved successfully',
    refunds: refunds.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      orderId: r.orderId,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
    total,
    skip: Number(skip),
    take: Number(take),
  })
})

/**
 * Confirm refund
 */
export const confirmRefund = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() })
  }

  const { refundId } = req.params
  const { refundTransactionId, status, gatewayResponse } = req.body

  const refund = await refundService.confirmRefund(
    refundId,
    refundTransactionId,
    status,
    gatewayResponse
  )

  logger.info(`Refund confirmed: ${refundId}`)

  res.status(200).json({
    message: 'Refund confirmed successfully',
    refund: {
      id: refund.id,
      paymentId: refund.paymentId,
      status: refund.status,
      refundTransactionId: refund.refundTransactionId,
      updatedAt: refund.updatedAt,
    },
  })
})

/**
 * Cancel payment
 */
export const cancelPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params

  const payment = await paymentService.cancelPayment(paymentId)

  logger.info(`Payment cancelled: ${paymentId}`)

  res.status(200).json({
    message: 'Payment cancelled successfully',
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      updatedAt: payment.updatedAt,
    },
  })
})

/**
 * Get refunds for payment
 */
export const getRefundsByPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params

  const refunds = await refundService.getRefundsByPayment(paymentId)

  res.status(200).json({
    message: 'Refunds retrieved successfully',
    refunds: refunds.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      orderId: r.orderId,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
    total: refunds.length,
  })
})
