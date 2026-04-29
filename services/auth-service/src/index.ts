import pino from 'pino';
import { createApp } from './app';
import { getRabbitMQService } from '@teleshop/common/rabbitmq';
import { PrismaClient } from '@prisma/client';

const logger = pino();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// ==================== STARTUP ====================
async function start() {
  try {
    logger.info('🚀 Auth Service starting...');

    // Initialize RabbitMQ
    logger.info('📡 Initializing RabbitMQ...');
    const rmq = getRabbitMQService();
    await rmq.initialize();
    logger.info('✅ RabbitMQ initialized');

    // Test database connection
    logger.info('🗄️  Testing database connection...');
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Auth Service listening on port ${PORT}`);
      logger.info(`
        ╔════════════════════════════════════════╗
        ║       🔐 Auth Service Started          ║
        ╠════════════════════════════════════════╣
        ║ Service: auth-service                  ║
        ║ Port: ${PORT}                              ║
        ║ Env: ${process.env.NODE_ENV || 'development'}               ║
        ║ Health: http://localhost:${PORT}/health   ║
        ║ API: http://localhost:${PORT}/api/auth    ║
        ╚════════════════════════════════════════╝
      `);
    });

    // ==================== GRACEFUL SHUTDOWN ====================
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('Server closed');

        // Close RabbitMQ connection
        if (rmq.isConnected()) {
          await rmq.close();
          logger.info('RabbitMQ connection closed');
        }

        // Close Prisma connection
        await prisma.$disconnect();
        logger.info('Database connection closed');

        logger.info('Auth Service shut down successfully');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error(error, 'Uncaught Exception');
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled Rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.error(error, '❌ Failed to start Auth Service');
    process.exit(1);
  }
}

start();
