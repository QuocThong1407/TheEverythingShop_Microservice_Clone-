import express, { Express } from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { errorHandler } from '@teleshop/common/middleware';
import { authRoutes } from './modules/auth';

const logger = pino();

export function createApp(): Express {
  const app = express();

  // ==================== MIDDLEWARE ====================
  // Logging
  app.use(pinoHttp());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ==================== HEALTH CHECK ====================
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  });

  // ==================== ROUTES ====================
  app.use('/api/auth', authRoutes);

  // ==================== 404 HANDLER ====================
  app.use((req, res) => {
    res.status(404).json({
      message: 'Route not found',
      path: req.path,
      method: req.method,
    });
  });

  // ==================== ERROR HANDLER ====================
  // Global error handler (must be last middleware)
  app.use(errorHandler);

  return app;
}
