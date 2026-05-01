import logger from '@teleshop/common/logger'

export interface PaymentRequest {
  orderId: string
  userId: string
  amount: number
  currency: string
  orderDescription?: string
  returnUrl?: string
  metadata?: any
}

export interface PaymentResponse {
  success: boolean
  paymentUrl?: string
  transactionId?: string
  message: string
  gatewayResponse?: any
}

export interface VerifyPaymentResponse {
  success: boolean
  transactionId: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  amount: number
  gatewayResponse: any
}

export class VNPAYGateway {
  private readonly vnpayUrl: string
  private readonly tmnCode: string
  private readonly hashSecret: string
  private readonly returnUrl: string

  constructor() {
    this.vnpayUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paygate/pay.html'
    this.tmnCode = process.env.VNPAY_TMN_CODE || ''
    this.hashSecret = process.env.VNPAY_HASH_SECRET || ''
    this.returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3006/api/payments/vnpay/callback'

    if (!this.tmnCode || !this.hashSecret) {
      logger.warn('VNPAY configuration incomplete - ensure VNPAY_TMN_CODE and VNPAY_HASH_SECRET are set')
    }
  }

  async initiate(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // VNPAY requires amount in VND, multiplied by 100
      const amount = Math.round(request.amount * 100)
      const createDate = new Date().toISOString().replace(/[-T:\.]/g, '').slice(0, 14)

      const params: any = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.tmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: request.orderId,
        vnp_OrderInfo: request.orderDescription || `Order ${request.orderId}`,
        vnp_OrderType: 'billpayment',
        vnp_Amount: amount,
        vnp_ReturnUrl: this.returnUrl,
        vnp_CreateDate: createDate,
        vnp_IpAddr: '127.0.0.1',
      }

      // Sort params for hash calculation
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key]
          return acc
        }, {} as any)

      // Generate secure hash (simplified - use proper HMAC-SHA512 in production)
      const hashInput = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')

      // In production, use crypto.createHmac('sha512', this.hashSecret)
      const vnp_SecureHash = 'demo_hash_' + Date.now() // Placeholder

      const paymentUrl = `${this.vnpayUrl}?${Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&')}&vnp_SecureHash=${vnp_SecureHash}`

      logger.info(`VNPAY payment initiated for order ${request.orderId}`)

      return {
        success: true,
        paymentUrl,
        message: 'Payment URL generated successfully',
        gatewayResponse: { tmnCode: this.tmnCode, orderInfo: params.vnp_OrderInfo },
      }
    } catch (error) {
      logger.error(`VNPAY initiation failed: ${error}`)
      return {
        success: false,
        message: 'Failed to initiate VNPAY payment',
        gatewayResponse: { error: String(error) },
      }
    }
  }

  async verify(transactionId: string, gatewayData: any): Promise<VerifyPaymentResponse> {
    // Verify VNPAY webhook signature
    // In production, verify vnp_SecureHash
    const success = gatewayData?.vnp_ResponseCode === '00' || gatewayData?.RespCode === '00'

    return {
      success,
      transactionId,
      status: success ? 'SUCCESS' : 'FAILED',
      amount: gatewayData?.vnp_Amount ? Number(gatewayData.vnp_Amount) / 100 : 0,
      gatewayResponse: gatewayData,
    }
  }
}

export class StripeGateway {
  private readonly apiKey: string
  private readonly webhookSecret: string
  private stripe: any

  constructor() {
    this.apiKey = process.env.STRIPE_API_KEY || ''
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    if (this.apiKey) {
      // Import stripe dynamically (optional dependency)
      try {
        // const Stripe = require('stripe')
        // this.stripe = new Stripe(this.apiKey)
      } catch (error) {
        logger.warn('Stripe library not available - install @stripe/stripe-js')
      }
    }
  }

  async initiate(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (!this.stripe) {
        return {
          success: false,
          message: 'Stripe gateway not configured',
          gatewayResponse: { error: 'Stripe not initialized' },
        }
      }

      // In production, use Stripe API
      // const session = await this.stripe.checkout.sessions.create({...})
      const paymentUrl = `https://checkout.stripe.com/pay/demo_${request.orderId}`

      logger.info(`Stripe payment initiated for order ${request.orderId}`)

      return {
        success: true,
        paymentUrl,
        message: 'Stripe payment URL generated successfully',
        gatewayResponse: { currency: request.currency },
      }
    } catch (error) {
      logger.error(`Stripe initiation failed: ${error}`)
      return {
        success: false,
        message: 'Failed to initiate Stripe payment',
        gatewayResponse: { error: String(error) },
      }
    }
  }

  async verify(transactionId: string, gatewayData: any): Promise<VerifyPaymentResponse> {
    const success = gatewayData?.status === 'succeeded' || gatewayData?.paid === true

    return {
      success,
      transactionId,
      status: success ? 'SUCCESS' : 'FAILED',
      amount: gatewayData?.amount ? Number(gatewayData.amount) / 100 : 0,
      gatewayResponse: gatewayData,
    }
  }
}

export class MomoGateway {
  private readonly partnerCode: string
  private readonly accessKey: string
  private readonly secretKey: string
  private readonly momoUrl: string
  private readonly returnUrl: string

  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || ''
    this.accessKey = process.env.MOMO_ACCESS_KEY || ''
    this.secretKey = process.env.MOMO_SECRET_KEY || ''
    this.momoUrl = process.env.MOMO_URL || 'https://test-payment.momo.vn/v3/gateway/api/create'
    this.returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:3006/api/payments/momo/callback'

    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      logger.warn('Momo configuration incomplete - ensure all Momo env vars are set')
    }
  }

  async initiate(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const requestId = `${Date.now()}`
      const orderId = request.orderId

      const rawSignature = `accessKey=${this.accessKey}&amount=${Math.round(request.amount)}&extraData=&ipnUrl=${this.returnUrl}&orderId=${orderId}&orderInfo=${request.orderDescription || `Order ${orderId}`}&partnerCode=${this.partnerCode}&requestId=${requestId}&redirectUrl=${this.returnUrl}`

      // In production, use HMAC-SHA256
      const signature = 'demo_signature_' + Date.now()

      const requestBody = {
        partnerCode: this.partnerCode,
        partnerName: 'The Everything Shop',
        partnerTransaction: orderId,
        accessKey: this.accessKey,
        requestId,
        orderId,
        orderInfo: request.orderDescription || `Order ${orderId}`,
        redirectUrl: this.returnUrl,
        ipnUrl: this.returnUrl,
        amount: Math.round(request.amount),
        ordertType: 'momo_wallet',
        requestType: 'captureWallet',
        sign: signature,
      }

      // In production, make actual HTTP request to Momo API
      const paymentUrl = `https://test-payment.momo.vn/login?data=demo_${orderId}`

      logger.info(`Momo payment initiated for order ${request.orderId}`)

      return {
        success: true,
        paymentUrl,
        message: 'Momo payment URL generated successfully',
        gatewayResponse: { partnerCode: this.partnerCode, requestId },
      }
    } catch (error) {
      logger.error(`Momo initiation failed: ${error}`)
      return {
        success: false,
        message: 'Failed to initiate Momo payment',
        gatewayResponse: { error: String(error) },
      }
    }
  }

  async verify(transactionId: string, gatewayData: any): Promise<VerifyPaymentResponse> {
    const success = gatewayData?.resultCode === 0 || gatewayData?.status === 'success'

    return {
      success,
      transactionId,
      status: success ? 'SUCCESS' : 'FAILED',
      amount: gatewayData?.amount ? Number(gatewayData.amount) : 0,
      gatewayResponse: gatewayData,
    }
  }
}

export class PaymentGatewayFactory {
  static create(method: string): VNPAYGateway | StripeGateway | MomoGateway {
    switch (method.toUpperCase()) {
      case 'VNPAY':
        return new VNPAYGateway()
      case 'STRIPE':
        return new StripeGateway()
      case 'MOMO':
        return new MomoGateway()
      default:
        return new VNPAYGateway()
    }
  }
}
