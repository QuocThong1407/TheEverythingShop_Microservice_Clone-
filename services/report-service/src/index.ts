import logger from 'pino'
import { initializeDatabase, disconnectDatabase } from './config/database.js'
import { createApp } from './app.js'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import { ReportService } from './modules/report/report.service.js'

const log = logger()

const PORT = process.env.PORT || 3007
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672'

async function main() {
  try {
    // Initialize database
    log.info('Initializing database...')
    const prisma = await initializeDatabase()

    // Initialize RabbitMQ
    log.info('Initializing RabbitMQ...')
    const rabbit = new RabbitMQService(RABBITMQ_URL)
    await rabbit.initialize()

    // Create Express app
    const app = createApp(prisma, rabbit)

    // Initialize Report Service and subscribe to events
    log.info('Initializing Report Service event subscription...')
    const reportService = new ReportService(prisma, rabbit)
    await reportService.subscribeToEvents()

    // Start server
    const server = app.listen(PORT, () => {
      log.info(`Report Service listening on port ${PORT}`)
    })

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      log.info(`Received ${signal}, starting graceful shutdown...`)

      server.close(async () => {
        log.info('HTTP server closed')

        try {
          await rabbit.close()
          log.info('RabbitMQ connection closed')
        } catch (error) {
          log.error('Error closing RabbitMQ:', error)
        }

        try {
          await disconnectDatabase()
        } catch (error) {
          log.error('Error disconnecting database:', error)
        }

        process.exit(0)
      })

      // Force shutdown after 30 seconds
      setTimeout(() => {
        log.warn('Forcing shutdown after timeout')
        process.exit(1)
      }, 30000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection at:', promise, 'reason:', reason)
    })

    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception:', error)
      process.exit(1)
    })
  } catch (error) {
    log.error('Failed to start Report Service:', error)
    process.exit(1)
  }
}

main()
