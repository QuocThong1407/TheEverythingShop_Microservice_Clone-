import { createApp } from './app.js'
import { prisma } from './config/database.js'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import logger from '@teleshop/common/logger'

const PORT = process.env.PORT || 3006
const rabbit = RabbitMQService.getInstance()

async function bootstrap() {
  try {
    // Initialize RabbitMQ
    await rabbit.initialize()
    logger.info('RabbitMQ connected')

    // Subscribe to ORDER_CREATED event (triggers payment flow)
    await rabbit.subscribe('payment-service-events-queue', ['order.created'], async (message: any) => {
      logger.info(`Received ORDER_CREATED event: ${message.aggregateId}`)
      // Payment will be triggered via API when user clicks pay
    })

    // Subscribe to payment confirmation events if needed
    await rabbit.subscribe('payment-service-events-queue', ['payment.*'], async (message: any) => {
      logger.info(`Received payment event: ${message.type}`)
    })

    const app = createApp()

    const server = app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`)
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`)

      server.close(async () => {
        logger.info('HTTP server closed')

        await rabbit.close()
        logger.info('RabbitMQ disconnected')

        await prisma.$disconnect()
        logger.info('Database disconnected')

        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    logger.error(`Bootstrap failed: ${error}`)
    process.exit(1)
  }
}

bootstrap()
