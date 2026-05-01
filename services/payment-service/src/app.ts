import express, { Request, Response, NextFunction } from 'express'
import pinoHttp from 'pino-http'
import { currentUser, errorHandler } from '@teleshop/common/middleware'
import logger from '@teleshop/common/logger'
import paymentRoutes from '../modules/payment/index.js'

export function createApp(): express.Application {
  const app = express()

  // Middleware
  app.use(pinoHttp({ logger }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ limit: '10mb', extended: true }))

  // User context
  app.use(currentUser)

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
    })
  })

  // Routes
  app.use('/api/payments', paymentRoutes)

  // 404 handler
  app.all('*', (req: Request, res: Response) => {
    res.status(404).json({
      message: `Route ${req.originalUrl} not found`,
    })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
