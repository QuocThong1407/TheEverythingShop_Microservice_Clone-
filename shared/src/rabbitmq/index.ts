import amqp, { Connection, Channel, Message } from 'amqplib';
import pino from 'pino';

const logger = pino();

/**
 * Event message interface
 */
export interface EventMessage {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: Record<string, any>;
  timestamp: string;
  version: number;
  source: string;
}

/**
 * RabbitMQ Message Handler callback
 */
export type MessageHandler = (message: EventMessage) => Promise<void>;

/**
 * RabbitMQ Singleton
 * Manages connection, channels, exchanges, and queues
 * Provides methods for publishing and subscribing to events
 */
export class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  /**
   * Get singleton instance
   */
  static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  /**
   * Initialize RabbitMQ connection and channel
   * Sets up exchanges
   */
  async initialize(): Promise<void> {
    if (this.connection || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const url =
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      logger.info('RabbitMQ connected and channel created');

      // Setup error handlers
      this.connection.on('error', (err) => {
        logger.error({ error: err }, 'RabbitMQ connection error');
        this.connection = null;
        this.channel = null;
      });

      this.connection.on('close', () => {
        logger.info('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
      });

      // Create default exchange (topic exchange for event routing)
      await this.channel.assertExchange('events', 'topic', { durable: true });

      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      logger.error(
        { error },
        'Failed to initialize RabbitMQ'
      );
      throw error;
    }
  }

  /**
   * Publish event to RabbitMQ
   * @param eventType - Event type (e.g., 'order.created')
   * @param message - Event message
   */
  async publish(eventType: string, message: EventMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ not initialized');
    }

    try {
      const content = Buffer.from(JSON.stringify(message));

      this.channel.publish('events', eventType, content, {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      });

      logger.info(
        { eventType, messageId: message.id },
        'Event published to RabbitMQ'
      );
    } catch (error) {
      logger.error(
        { error, eventType },
        'Failed to publish event to RabbitMQ'
      );
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param queueName - Queue name
   * @param eventPatterns - Event type patterns (e.g., ['order.*', 'payment.*'])
   * @param handler - Message handler function
   */
  async subscribe(
    queueName: string,
    eventPatterns: string[],
    handler: MessageHandler
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ not initialized');
    }

    try {
      // Declare queue
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind queue to exchange with patterns
      for (const pattern of eventPatterns) {
        await this.channel.bindQueue(queueName, 'events', pattern);
      }

      // Set prefetch count (process one message at a time)
      await this.channel.prefetch(1);

      // Consume messages
      await this.channel.consume(
        queueName,
        async (msg: Message | null) => {
          if (!msg) {
            return;
          }

          try {
            const content = msg.content.toString('utf-8');
            const eventMessage: EventMessage = JSON.parse(content);

            logger.info(
              { eventType: eventMessage.type, queueName },
              'Processing event from RabbitMQ'
            );

            await handler(eventMessage);

            // Acknowledge message after successful processing
            this.channel!.ack(msg);
          } catch (error) {
            logger.error(
              { error, queueName },
              'Error processing RabbitMQ message'
            );
            // Reject message and requeue
            this.channel!.nack(msg, false, true);
          }
        },
        { noAck: false }
      );

      logger.info(
        { queueName, patterns: eventPatterns },
        'Subscribed to events'
      );
    } catch (error) {
      logger.error(
        { error, queueName },
        'Failed to subscribe to events'
      );
      throw error;
    }
  }

  /**
   * Close RabbitMQ connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error({ error }, 'Error closing RabbitMQ connection');
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

/**
 * Factory function to get RabbitMQ instance
 */
export function getRabbitMQService(): RabbitMQService {
  return RabbitMQService.getInstance();
}
