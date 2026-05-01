import { PrismaClient, Notification, Template } from '@prisma/client'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import logger from 'pino'
import { TemplateRepository, NotificationRepository } from './notification.repository.js'
import { EmailService } from '../services/email.service.js'

const log = logger()

interface EventData {
  id: string
  type: string
  aggregateId: string
  data: any
  timestamp: Date
}

export class NotificationService {
  private templateRepo: TemplateRepository
  private notificationRepo: NotificationRepository
  private emailService: EmailService
  private processingQueue: Set<string> = new Set()

  constructor(
    private prisma: PrismaClient,
    private rabbit: RabbitMQService
  ) {
    this.templateRepo = new TemplateRepository(prisma)
    this.notificationRepo = new NotificationRepository(prisma)
    this.emailService = new EmailService()
  }

  /**
   * Initialize event subscriptions and background processing
   */
  async initialize(): Promise<void> {
    try {
      // Verify email service
      const emailVerified = await this.emailService.verify()
      if (!emailVerified) {
        log.warn('Email service verification failed - emails may not send')
      }

      // Subscribe to events
      await this.subscribeToEvents()

      // Start background processing of pending notifications
      this.startBackgroundProcessing()

      log.info('Notification Service initialized successfully')
    } catch (error) {
      log.error('Failed to initialize Notification Service:', error)
      throw error
    }
  }

  /**
   * Subscribe to relevant events
   */
  private async subscribeToEvents(): Promise<void> {
    const patterns = [
      'user.registered',      // USER_REGISTERED
      'order.created',        // ORDER_CREATED
      'order.completed',      // ORDER_COMPLETED
      'payment.success',      // PAYMENT_SUCCESS
      'payment.failed',       // PAYMENT_FAILED
      'return.created',       // RETURN_CREATED
      'return.completed',     // RETURN_COMPLETED
      'review.submitted',     // REVIEW_SUBMITTED
    ]

    await this.rabbit.subscribe(
      'notification-service-events-queue',
      patterns,
      async (event) => {
        await this.handleEvent(event)
      }
    )

    log.info('Notification Service subscribed to events')
  }

  /**
   * Handle incoming events and trigger notifications
   */
  private async handleEvent(event: EventData): Promise<void> {
    try {
      switch (event.type) {
        case 'USER_REGISTERED':
          await this.handleUserRegistered(event)
          break
        case 'ORDER_CREATED':
          await this.handleOrderCreated(event)
          break
        case 'ORDER_COMPLETED':
          await this.handleOrderCompleted(event)
          break
        case 'PAYMENT_SUCCESS':
          await this.handlePaymentSuccess(event)
          break
        case 'PAYMENT_FAILED':
          await this.handlePaymentFailed(event)
          break
        case 'RETURN_CREATED':
          await this.handleReturnCreated(event)
          break
        case 'RETURN_COMPLETED':
          await this.handleReturnCompleted(event)
          break
        case 'REVIEW_SUBMITTED':
          await this.handleReviewSubmitted(event)
          break
        default:
          log.warn(`Unhandled event type: ${event.type}`)
      }
    } catch (error) {
      log.error(`Error handling event ${event.type}:`, error)
    }
  }

  /**
   * Event handlers
   */
  private async handleUserRegistered(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('USER_REGISTERED', 0, 1)
      if (!template || !template[0]) {
        log.warn('No template found for USER_REGISTERED')
        return
      }

      const tpl = template[0]
      const { userId, email, userName } = event.data

      const body = this.renderTemplate(tpl.body, {
        userName: userName || email,
        email,
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email,
        eventId: event.id,
        eventType: 'USER_REGISTERED',
        subject: tpl.subject,
        body,
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling USER_REGISTERED:', error)
    }
  }

  private async handleOrderCreated(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('ORDER_CREATED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { orderId, userId, userEmail, totalAmount } = event.data

      const body = this.renderTemplate(tpl.body, {
        orderId,
        totalAmount,
        currency: 'VND',
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'ORDER_CREATED',
        subject: tpl.subject,
        body,
        metadata: { orderId },
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling ORDER_CREATED:', error)
    }
  }

  private async handleOrderCompleted(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('ORDER_COMPLETED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { orderId, userId, userEmail, trackingNumber } = event.data

      const body = this.renderTemplate(tpl.body, {
        orderId,
        trackingNumber,
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'ORDER_COMPLETED',
        subject: tpl.subject,
        body,
        metadata: { orderId },
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling ORDER_COMPLETED:', error)
    }
  }

  private async handlePaymentSuccess(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('PAYMENT_SUCCESS', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { paymentId, userId, userEmail, amount, orderId } = event.data

      const body = this.renderTemplate(tpl.body, {
        orderId,
        paymentId,
        amount,
        currency: 'VND',
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'PAYMENT_SUCCESS',
        subject: tpl.subject,
        body,
        metadata: { paymentId, orderId },
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling PAYMENT_SUCCESS:', error)
    }
  }

  private async handlePaymentFailed(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('PAYMENT_FAILED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { paymentId, userId, userEmail, reason } = event.data

      const body = this.renderTemplate(tpl.body, {
        paymentId,
        reason,
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'PAYMENT_FAILED',
        subject: tpl.subject,
        body,
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling PAYMENT_FAILED:', error)
    }
  }

  private async handleReturnCreated(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('RETURN_CREATED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { returnId, userId, userEmail, orderId, reason } = event.data

      const body = this.renderTemplate(tpl.body, {
        returnId,
        orderId,
        reason,
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'RETURN_CREATED',
        subject: tpl.subject,
        body,
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling RETURN_CREATED:', error)
    }
  }

  private async handleReturnCompleted(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('RETURN_COMPLETED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { returnId, userId, userEmail, refundAmount } = event.data

      const body = this.renderTemplate(tpl.body, {
        returnId,
        refundAmount,
        currency: 'VND',
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'RETURN_COMPLETED',
        subject: tpl.subject,
        body,
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling RETURN_COMPLETED:', error)
    }
  }

  private async handleReviewSubmitted(event: EventData): Promise<void> {
    try {
      const template = await this.templateRepo.findByEventType('REVIEW_SUBMITTED', 0, 1)
      if (!template || !template[0]) return

      const tpl = template[0]
      const { reviewId, userId, userEmail, productName, rating } = event.data

      const body = this.renderTemplate(tpl.body, {
        reviewId,
        productName,
        rating,
      })

      const notification = await this.notificationRepo.create({
        templateId: tpl.id,
        userId,
        email: userEmail,
        eventId: event.id,
        eventType: 'REVIEW_SUBMITTED',
        subject: tpl.subject,
        body,
      })

      await this.sendNotificationAsync(notification)
    } catch (error) {
      log.error('Error handling REVIEW_SUBMITTED:', error)
    }
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value || ''))
    })

    return rendered
  }

  /**
   * Send notification asynchronously
   */
  private async sendNotificationAsync(notification: Notification): Promise<void> {
    // Don't wait for completion
    this.sendNotification(notification).catch(error => {
      log.error(`Failed to send notification ${notification.id}:`, error)
    })
  }

  /**
   * Send notification and update status
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      const notificationId = notification.id

      // Prevent duplicate processing
      if (this.processingQueue.has(notificationId)) {
        return
      }
      this.processingQueue.add(notificationId)

      try {
        // Update status to SENDING
        await this.notificationRepo.updateStatus(notificationId, 'SENDING')

        // Send email
        const result = await this.emailService.send({
          to: notification.email,
          subject: notification.subject,
          html: notification.body,
        })

        if (result.success) {
          // Mark as sent
          await this.notificationRepo.updateStatus(notificationId, 'SENT')
          log.info(`Notification ${notificationId} sent successfully`)
        } else {
          // Mark as failed or retry
          const updatedNotification = await this.notificationRepo.incrementRetry(notificationId)

          if (updatedNotification.retryCount >= updatedNotification.maxRetries) {
            await this.notificationRepo.updateStatus(notificationId, 'FAILED')
            await this.notificationRepo.setError(notificationId, result.error || 'Unknown error')
            log.error(`Notification ${notificationId} failed after ${updatedNotification.retryCount} retries`)
          } else {
            // Keep as PENDING for retry
            log.warn(`Notification ${notificationId} will be retried (attempt ${updatedNotification.retryCount})`)
          }
        }
      } finally {
        this.processingQueue.delete(notificationId)
      }
    } catch (error) {
      log.error(`Error sending notification ${notification.id}:`, error)
      this.processingQueue.delete(notification.id)
    }
  }

  /**
   * Start background processing of pending notifications
   */
  private startBackgroundProcessing(): void {
    // Process pending notifications every 30 seconds
    setInterval(async () => {
      try {
        const pending = await this.notificationRepo.findPendingNotifications(50)

        for (const notification of pending) {
          await this.sendNotification(notification)
        }

        if (pending.length > 0) {
          log.debug(`Processed ${pending.length} pending notifications`)
        }
      } catch (error) {
        log.error('Error in background processing:', error)
      }
    }, 30000) // 30 seconds
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification | null> {
    return this.notificationRepo.findById(notificationId)
  }

  /**
   * List user notifications
   */
  async getUserNotifications(userId: string, skip: number, take: number): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      this.notificationRepo.findByUserId(userId, skip, take),
      this.notificationRepo.count({ userId }),
    ])

    return { notifications, total }
  }

  /**
   * Resend notification
   */
  async resendNotification(notificationId: string): Promise<Notification | null> {
    const notification = await this.notificationRepo.findById(notificationId)
    if (!notification) return null

    // Reset retry count
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'PENDING',
        retryCount: 0,
        errorMessage: null,
      },
      include: { template: true },
    })

    // Send immediately
    await this.sendNotification(updated)

    return updated
  }

  /**
   * Template management
   */
  async createTemplate(data: {
    name: string
    eventType: string
    subject: string
    body: string
    variables?: string[]
  }): Promise<Template> {
    return this.templateRepo.create(data)
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    return this.templateRepo.findById(templateId)
  }

  async listTemplates(filters: any, skip: number, take: number): Promise<{ templates: Template[]; total: number }> {
    const [templates, total] = await Promise.all([
      this.templateRepo.list(filters, skip, take),
      this.templateRepo.count(filters),
    ])

    return { templates, total }
  }

  async updateTemplate(templateId: string, data: any): Promise<Template> {
    return this.templateRepo.update(templateId, data)
  }

  async deleteTemplate(templateId: string): Promise<Template> {
    return this.templateRepo.delete(templateId)
  }
}
