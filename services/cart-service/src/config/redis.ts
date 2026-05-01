import { createClient } from '@redis/client';
import { logger } from '@teleshop/common/middleware';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
  url: REDIS_URL,
});

export async function connectRedis(): Promise<void> {
  try {
    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redis.on('connect', () => {
      logger.info('✅ Connected to Redis');
    });

    redis.on('ready', () => {
      logger.info('✅ Redis is ready');
    });

    redis.on('close', () => {
      logger.info('✅ Redis connection closed');
    });

    await redis.connect();
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('✅ Redis disconnected');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}
