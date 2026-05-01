import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Clear existing data
    await prisma.metric.deleteMany({})
    await prisma.report.deleteMany({})

    console.log('Creating demo reports...')

    // Demo data - admin user UUID
    const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'

    // Sales Report
    const salesReport = await prisma.report.create({
      data: {
        name: 'April 2026 Sales Report',
        type: 'SALES',
        period: 'MONTHLY',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
        createdBy: ADMIN_ID,
        description: 'Monthly sales performance for April 2026',
        status: 'COMPLETED',
        eventTypes: ['ORDER_CREATED', 'PAYMENT_SUCCESS'],
        dataSource: 'events',
      },
    })

    // Metrics for Sales Report
    await prisma.metric.createMany({
      data: [
        {
          reportId: salesReport.id,
          metricName: 'total_revenue',
          value: 125000000,
          unit: 'VND',
          metadata: { currency: 'VND', region: 'all' },
        },
        {
          reportId: salesReport.id,
          metricName: 'order_count',
          value: 1250,
          unit: 'count',
          metadata: { status: 'completed' },
        },
        {
          reportId: salesReport.id,
          metricName: 'avg_order_value',
          value: 100000,
          unit: 'VND',
          metadata: { calculation: 'total_revenue / order_count' },
        },
      ],
    })

    // Orders Report
    const ordersReport = await prisma.report.create({
      data: {
        name: 'Order Performance - Week 17',
        type: 'ORDERS',
        period: 'WEEKLY',
        startDate: new Date('2026-04-20'),
        endDate: new Date('2026-04-26'),
        createdBy: ADMIN_ID,
        description: 'Weekly order metrics',
        status: 'COMPLETED',
        eventTypes: ['ORDER_CREATED', 'ORDER_COMPLETED', 'ORDER_CANCELLED'],
        dataSource: 'events',
      },
    })

    // Metrics for Orders Report
    await prisma.metric.createMany({
      data: [
        {
          reportId: ordersReport.id,
          metricName: 'total_orders',
          value: 287,
          unit: 'count',
          metadata: { period: 'weekly' },
        },
        {
          reportId: ordersReport.id,
          metricName: 'avg_order_value',
          value: 95000,
          unit: 'VND',
          metadata: { period: 'weekly' },
        },
      ],
    })

    // Payments Report
    const paymentsReport = await prisma.report.create({
      data: {
        name: 'Payment Gateway Analysis',
        type: 'PAYMENTS',
        period: 'MONTHLY',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
        createdBy: ADMIN_ID,
        description: 'Payment success rates by gateway',
        status: 'COMPLETED',
        eventTypes: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REFUND_COMPLETED'],
        dataSource: 'events',
      },
    })

    // Metrics for Payments Report
    await prisma.metric.createMany({
      data: [
        {
          reportId: paymentsReport.id,
          metricName: 'successful_payments',
          value: 1200,
          unit: 'count',
          metadata: { gateway: 'all' },
        },
        {
          reportId: paymentsReport.id,
          metricName: 'failed_payments',
          value: 50,
          unit: 'count',
          metadata: { gateway: 'all' },
        },
        {
          reportId: paymentsReport.id,
          metricName: 'total_revenue',
          value: 125000000,
          unit: 'VND',
          metadata: { from_successful_payments: true },
        },
      ],
    })

    // Users Report
    const usersReport = await prisma.report.create({
      data: {
        name: 'User Growth Report',
        type: 'USERS',
        period: 'MONTHLY',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
        createdBy: ADMIN_ID,
        description: 'New user registrations in April',
        status: 'COMPLETED',
        eventTypes: ['USER_REGISTERED', 'USER_UPDATED'],
        dataSource: 'events',
      },
    })

    // Metrics for Users Report
    await prisma.metric.createMany({
      data: [
        {
          reportId: usersReport.id,
          metricName: 'new_users',
          value: 523,
          unit: 'count',
          metadata: { period: 'monthly' },
        },
      ],
    })

    console.log('✓ Demo reports created successfully')
    console.log(`✓ Created ${4} reports with ${10} metrics`)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
