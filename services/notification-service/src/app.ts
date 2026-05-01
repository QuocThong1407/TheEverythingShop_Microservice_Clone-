import express, { Express, Request, Response, NextFunction } from 'express'
import pinoHttp from 'pino-http'
import logger from 'pino'
import { PrismaClient } from '@prisma/client'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import { errorHandler, currentUser } from '@teleshop/common/middleware'
import { createNotificationRoutes } from './modules/notification/notification.routes.js'

const log = logger()

export function createApp(prisma: PrismaClient, rabbit: RabbitMQService): Express {
  const app = express()

  // Middleware
  app.use(pinoHttp({ logger }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ limit: '10mb', extended: true }))

  // Current user middleware
  app.use(currentUser)

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    })
  })

  // API routes
  app.use('/api/notifications', createNotificationRoutes(prisma, rabbit))

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      message: 'Route not found',
      path: req.path,
    })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
