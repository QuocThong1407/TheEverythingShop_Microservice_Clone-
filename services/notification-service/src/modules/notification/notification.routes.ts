import { Router } from 'express'
import { requireAuth, requireRole } from '@teleshop/common/middleware'
import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateGetTemplate,
  validateListTemplates,
  validateGetNotification,
  validateListNotifications,
  validateResendNotification,
  validateDeleteTemplate,
} from './notification.validation.js'
import { NotificationController } from './notification.controller.js'
import { NotificationService } from './notification.service.js'
import { PrismaClient } from '@prisma/client'
import { RabbitMQService } from '@teleshop/common/rabbitmq'

export function createNotificationRoutes(
  prisma: PrismaClient,
  rabbit: RabbitMQService
): Router {
  const router = Router()
  const notificationService = new NotificationService(prisma, rabbit)
  const controller = new NotificationController(notificationService)

  /**
   * Template management (admin only)
   */

  /**
   * Create template
   * POST /api/notifications/templates
   */
  router.post(
    '/templates',
    requireAuth,
    requireRole('ADMIN'),
    validateCreateTemplate,
    (req, res) => controller.createTemplate(req, res)
  )

  /**
   * List templates
   * GET /api/notifications/templates
   */
  router.get(
    '/templates',
    requireAuth,
    validateListTemplates,
    (req, res) => controller.listTemplates(req, res)
  )

  /**
   * Get template
   * GET /api/notifications/templates/:templateId
   */
  router.get(
    '/templates/:templateId',
    requireAuth,
    validateGetTemplate,
    (req, res) => controller.getTemplate(req, res)
  )

  /**
   * Update template
   * PUT /api/notifications/templates/:templateId
   */
  router.put(
    '/templates/:templateId',
    requireAuth,
    requireRole('ADMIN'),
    validateUpdateTemplate,
    (req, res) => controller.updateTemplate(req, res)
  )

  /**
   * Delete template
   * DELETE /api/notifications/templates/:templateId
   */
  router.delete(
    '/templates/:templateId',
    requireAuth,
    requireRole('ADMIN'),
    validateDeleteTemplate,
    (req, res) => controller.deleteTemplate(req, res)
  )

  /**
   * Notification management
   */

  /**
   * Get user notifications
   * GET /api/notifications
   */
  router.get(
    '/',
    requireAuth,
    validateListNotifications,
    (req, res) => controller.getUserNotifications(req, res)
  )

  /**
   * Get notification
   * GET /api/notifications/:notificationId
   */
  router.get(
    '/:notificationId',
    requireAuth,
    validateGetNotification,
    (req, res) => controller.getNotification(req, res)
  )

  /**
   * Resend notification
   * POST /api/notifications/:notificationId/resend
   */
  router.post(
    '/:notificationId/resend',
    requireAuth,
    requireRole('ADMIN'),
    validateResendNotification,
    (req, res) => controller.resendNotification(req, res)
  )

  return router
}
