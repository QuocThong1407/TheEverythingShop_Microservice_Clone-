import { prisma } from '../src/config/database.js'
import { PaymentStatus, RefundStatus } from '@prisma/client'

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.refund.deleteMany({})
  await prisma.payment.deleteMany({})

  // Create demo payments
  const payment1 = await prisma.payment.create({
    data: {
      orderId: '550e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440002',
      amount: '1500.00',
      currency: 'VND',
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'VNPAY',
      transactionId: 'VNPAY_TXN_001',
      gatewayResponse: {
        responseCode: '00',
        message: 'Approved',
      },
    },
  })

  const payment2 = await prisma.payment.create({
    data: {
      orderId: '550e8400-e29b-41d4-a716-446655440003',
      userId: '550e8400-e29b-41d4-a716-446655440004',
      amount: '2500.00',
      currency: 'VND',
      status: PaymentStatus.PENDING,
      paymentMethod: 'STRIPE',
    },
  })

  const payment3 = await prisma.payment.create({
    data: {
      orderId: '550e8400-e29b-41d4-a716-446655440005',
      userId: '550e8400-e29b-41d4-a716-446655440006',
      amount: '800.00',
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
      paymentMethod: 'MOMO',
      transactionId: 'MOMO_TXN_001',
      gatewayResponse: {
        resultCode: 0,
        message: 'Success',
      },
    },
  })

  // Create demo refunds
  const refund1 = await prisma.refund.create({
    data: {
      paymentId: payment1.id,
      orderId: payment1.orderId,
      userId: payment1.userId,
      amount: '500.00',
      reason: 'Customer requested partial refund due to damaged product',
      status: RefundStatus.COMPLETED,
      refundTransactionId: 'REFUND_001',
      gatewayResponse: {
        refundCode: '00',
        message: 'Refund successful',
      },
    },
  })

  console.log('Database seeding completed!')
  console.log(`Created ${3} demo payments`)
  console.log(`Created ${1} demo refunds`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
