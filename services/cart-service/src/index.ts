import { app } from './app';
import { connectRedis, redis, disconnectRedis } from './config/redis';
import { logger } from '@teleshop/common/middleware';
import { RabbitMQService } from '@teleshop/common/rabbitmq';

const PORT = process.env.PORT || 3004;

async function startServer() {
  try {
    // ============ REDIS CONNECTION ============
    
    await connectRedis();
    logger.info('✅ Connected to Redis');

    // ============ RABBITMQ CONNECTION ============

    const rabbitmq = RabbitMQService.getInstance();
    await rabbitmq.initialize();
    logger.info('✅ Connected to RabbitMQ');

    // ============ SERVER START ============

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Cart Service running on port ${PORT}`);
    });

    // ============ GRACEFUL SHUTDOWN ============

    const gracefulShutdown = async () => {
      logger.info('🛑 Shutting down gracefully...');
      
      server.close(async () => {
        try {
          await rabbitmq.close();
          logger.info('✅ RabbitMQ connection closed');
          
          await disconnectRedis();
          logger.info('✅ Redis connection closed');
          
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
