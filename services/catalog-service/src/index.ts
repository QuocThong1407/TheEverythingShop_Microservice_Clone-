import pino from 'pino';
import { createApp } from './app';
import { getRabbitMQService } from '@teleshop/common/rabbitmq';
import { CatalogService } from './modules/catalog';
import { PrismaClient } from '@prisma/client';
import { OrderEvents } from '@teleshop/common/events';

const logger = pino();
const PORT = process.env.PORT || 3003;
const prisma = new PrismaClient();

// ==================== EVENT HANDLERS ====================
async function setupEventHandlers(rmq: any) {
  try {
    // Listen for order events that affect catalog inventory
    await rmq.subscribe(
      'catalog-service-events-queue',
      [OrderEvents.ORDER_CREATED, OrderEvents.ORDER_CANCELLED],
      async (message: any) => {
        logger.info({ eventType: message.type }, 'Received order event');

        try {
          if (message.type === OrderEvents.ORDER_CREATED) {
            // Order created - reserve inventory
            for (const item of message.data.items) {
              await CatalogService.reserveInventory(item.productId, item.quantity);
            }
            logger.info({ orderId: message.data.orderId }, 'Inventory reserved for order');
          }

          if (message.type === OrderEvents.ORDER_CANCELLED) {
            // Order cancelled - restore inventory
            for (const item of message.data.items) {
              await CatalogService.restoreInventory(item.productId, item.quantity);
            }
            logger.info({ orderId: message.data.orderId }, 'Inventory restored for cancelled order');
          }
        } catch (error) {
          logger.error(error, 'Error handling order event');
          throw error; // Requeue on error
        }
      }
    );

    logger.info('Event handlers setup complete');
  } catch (error) {
    logger.error(error, 'Error setting up event handlers');
    throw error;
  }
}

// ==================== STARTUP ====================
async function start() {
  try {
    logger.info('🚀 Catalog Service starting...');

    // Initialize RabbitMQ
    logger.info('📡 Initializing RabbitMQ...');
    const rmq = getRabbitMQService();
    await rmq.initialize();
    logger.info('✅ RabbitMQ initialized');

    // Setup event handlers
    logger.info('📡 Setting up event handlers...');
    await setupEventHandlers(rmq);
    logger.info('✅ Event handlers setup');

    // Test database connection
    logger.info('🗄️  Testing database connection...');
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Catalog Service listening on port ${PORT}`);
      logger.info(`
        ╔════════════════════════════════════════╗
        ║    📦 Catalog Service Started          ║
        ╠════════════════════════════════════════╣
        ║ Service: catalog-service               ║
        ║ Port: ${PORT}                              ║
        ║ Env: ${process.env.NODE_ENV || 'development'}               ║
        ║ Health: http://localhost:${PORT}/health   ║
        ║ API: http://localhost:${PORT}/api/catalog ║
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

        logger.info('Catalog Service shut down successfully');
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
    logger.error(error, '❌ Failed to start Catalog Service');
    process.exit(1);
  }
}

start();
