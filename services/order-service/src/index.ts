import { PrismaClient } from '@prisma/client';
import { app } from './app';
import { logger } from '@teleshop/common/middleware';
import { RabbitMQService } from '@teleshop/common/rabbitmq';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3005;

async function startServer() {
  try {
    // ============ DATABASE CONNECTION ============
    
    await prisma.$connect();
    logger.info('✅ Connected to PostgreSQL (catalog_db)');

    // ============ RABBITMQ CONNECTION ============

    const rabbitmq = RabbitMQService.getInstance();
    await rabbitmq.initialize();
    logger.info('✅ Connected to RabbitMQ');

    // ============ EVENT SUBSCRIPTIONS ============

    // Subscribe to PAYMENT_SUCCESS event (from Payment Service)
    await rabbitmq.subscribe(
      'order-service-events-queue',
      ['payment.success'],
      async (message: any) => {
        try {
          logger.info('Received PAYMENT_SUCCESS event:', message.data);
          
          const { orderId, paymentStatus } = message.data;
          
          // Update order payment status to COMPLETED
          if (paymentStatus === 'COMPLETED') {
            await prisma.order.update({
              where: { id: orderId },
              data: { paymentStatus: 'COMPLETED' },
            });
            logger.info(`Order ${orderId} payment status updated to COMPLETED`);
          }
        } catch (error) {
          logger.error('Failed to process PAYMENT_SUCCESS event:', error);
          throw error; // Requeue on error
        }
      }
    );

    // Subscribe to PAYMENT_FAILED event (from Payment Service)
    await rabbitmq.subscribe(
      'order-service-events-queue',
      ['payment.failed'],
      async (message: any) => {
        try {
          logger.info('Received PAYMENT_FAILED event:', message.data);
          
          const { orderId } = message.data;
          
          // Update order payment status to FAILED
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'FAILED' },
          });
          logger.info(`Order ${orderId} payment status updated to FAILED`);
        } catch (error) {
          logger.error('Failed to process PAYMENT_FAILED event:', error);
          throw error; // Requeue on error
        }
      }
    );

    // ============ SERVER START ============

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Order Service running on port ${PORT}`);
    });

    // ============ GRACEFUL SHUTDOWN ============

    const gracefulShutdown = async () => {
      logger.info('🛑 Shutting down gracefully...');
      
      server.close(async () => {
        try {
          await rabbitmq.close();
          logger.info('✅ RabbitMQ connection closed');
          
          await prisma.$disconnect();
          logger.info('✅ PostgreSQL connection closed');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('❌ Graceful shutdown timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
