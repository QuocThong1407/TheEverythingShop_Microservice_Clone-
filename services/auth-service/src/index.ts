import express from 'express';
import pinoHttp from 'pino-http';
import { errorHandler, asyncHandler } from '@teleshop/common/middleware';
import { getRabbitMQService } from '@teleshop/common/rabbitmq';
import pino from 'pino';

const logger = pino();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== MIDDLEWARE ====================
// Logging
app.use(pinoHttp());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// ==================== ROUTES ====================
// TODO: Add your routes here

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ==================== STARTUP ====================
async function start() {
  try {
    // Initialize RabbitMQ
    const rmq = getRabbitMQService();
    await rmq.initialize();
    logger.info('RabbitMQ initialized');

    // TODO: Connect to database (Prisma)

    // Start server
    app.listen(PORT, () => {
      logger.info(`Auth Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start Auth Service');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const rmq = getRabbitMQService();
  if (rmq.isConnected()) {
    await rmq.close();
  }
  process.exit(0);
});

start();
