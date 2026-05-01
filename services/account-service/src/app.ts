import express, { Express } from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { errorHandler } from '@teleshop/common/middleware';
import { currentUser } from '@teleshop/common/middleware';
import { accountRoutes } from './modules/account';

const logger = pino();

export function createApp(): Express {
  const app = express();

  // ==================== MIDDLEWARE ====================
  // Logging
  app.use(pinoHttp());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add currentUser middleware globally for optional auth
  app.use(currentUser);

  // ==================== HEALTH CHECK ====================
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'account-service',
      timestamp: new Date().toISOString(),
    });
  });

  // ==================== ROUTES ====================
  app.use('/api/account', accountRoutes);

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
