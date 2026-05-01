import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Clear existing data
    await prisma.notification.deleteMany({})
    await prisma.template.deleteMany({})

    console.log('Creating email templates...')

    // User Registration Template
    await prisma.template.create({
      data: {
        name: 'user_welcome',
        eventType: 'USER_REGISTERED',
        subject: 'Welcome to TeleShop!',
        body: `
          <h1>Welcome to TeleShop!</h1>
          <p>Dear {{userName}},</p>
          <p>Thank you for registering with us. We're excited to have you on board!</p>
          <p>Your account has been successfully created with the email: {{email}}</p>
          <p>You can now start shopping with TeleShop.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['userName', 'email'],
        isActive: true,
      },
    })

    // Order Created Template
    await prisma.template.create({
      data: {
        name: 'order_confirmation',
        eventType: 'ORDER_CREATED',
        subject: 'Your Order #{{orderId}} Has Been Confirmed',
        body: `
          <h1>Order Confirmation</h1>
          <p>Thank you for your order!</p>
          <p>Order ID: {{orderId}}</p>
          <p>Total Amount: {{totalAmount}} {{currency}}</p>
          <p>We are processing your order and will ship it soon.</p>
          <p>You will receive a tracking number once your order is dispatched.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['orderId', 'totalAmount', 'currency'],
        isActive: true,
      },
    })

    // Order Completed Template
    await prisma.template.create({
      data: {
        name: 'order_shipped',
        eventType: 'ORDER_COMPLETED',
        subject: 'Your Order Has Been Shipped!',
        body: `
          <h1>Your Order Has Been Shipped!</h1>
          <p>Great news! Your order is on its way.</p>
          <p>Order ID: {{orderId}}</p>
          <p>Tracking Number: {{trackingNumber}}</p>
          <p>You can track your package using the tracking number above.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['orderId', 'trackingNumber'],
        isActive: true,
      },
    })

    // Payment Success Template
    await prisma.template.create({
      data: {
        name: 'payment_success',
        eventType: 'PAYMENT_SUCCESS',
        subject: 'Payment Confirmation for Order #{{orderId}}',
        body: `
          <h1>Payment Confirmed</h1>
          <p>Your payment has been successfully processed!</p>
          <p>Order ID: {{orderId}}</p>
          <p>Payment ID: {{paymentId}}</p>
          <p>Amount: {{amount}} {{currency}}</p>
          <p>Your order will be processed and shipped shortly.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['orderId', 'paymentId', 'amount', 'currency'],
        isActive: true,
      },
    })

    // Payment Failed Template
    await prisma.template.create({
      data: {
        name: 'payment_failed',
        eventType: 'PAYMENT_FAILED',
        subject: 'Payment Failed - Please Retry',
        body: `
          <h1>Payment Failed</h1>
          <p>Unfortunately, your payment could not be processed.</p>
          <p>Payment ID: {{paymentId}}</p>
          <p>Reason: {{reason}}</p>
          <p>Please try again or contact our support team for assistance.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['paymentId', 'reason'],
        isActive: true,
      },
    })

    // Return Created Template
    await prisma.template.create({
      data: {
        name: 'return_initiated',
        eventType: 'RETURN_CREATED',
        subject: 'Your Return Request #{{returnId}} Has Been Received',
        body: `
          <h1>Return Request Received</h1>
          <p>We've received your return request for order {{orderId}}.</p>
          <p>Return ID: {{returnId}}</p>
          <p>Reason: {{reason}}</p>
          <p>We will process your return and get back to you soon.</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['returnId', 'orderId', 'reason'],
        isActive: true,
      },
    })

    // Return Completed Template
    await prisma.template.create({
      data: {
        name: 'return_completed',
        eventType: 'RETURN_COMPLETED',
        subject: 'Your Return Has Been Processed',
        body: `
          <h1>Return Completed</h1>
          <p>Your return has been successfully processed!</p>
          <p>Return ID: {{returnId}}</p>
          <p>Refund Amount: {{refundAmount}} {{currency}}</p>
          <p>The refund will be credited to your original payment method within 5-10 business days.</p>
          <p>Thank you for shopping with us!</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['returnId', 'refundAmount', 'currency'],
        isActive: true,
      },
    })

    // Review Submitted Template
    await prisma.template.create({
      data: {
        name: 'review_thanks',
        eventType: 'REVIEW_SUBMITTED',
        subject: 'Thank You for Your Review!',
        body: `
          <h1>Thank You for Your Review!</h1>
          <p>We appreciate your feedback on {{productName}}.</p>
          <p>Review ID: {{reviewId}}</p>
          <p>Your Rating: {{rating}} stars</p>
          <p>Your review helps other customers make informed decisions. Thank you!</p>
          <p>Best regards,<br/>The TeleShop Team</p>
        `,
        variables: ['reviewId', 'productName', 'rating'],
        isActive: true,
      },
    })

    console.log('✓ Email templates created successfully')
    console.log(`✓ Created 8 notification templates`)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
