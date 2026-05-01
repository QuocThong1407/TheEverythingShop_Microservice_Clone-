import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import logger from 'pino'
import { NotificationService } from './notification.service.js'
import { NotFoundError, BadRequestError, ConflictError } from '@teleshop/common/errors'

const log = logger()

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Create notification template
   * POST /api/notifications/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'body' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const { name, eventType, subject, body, variables, isActive } = req.body

      // Check if template already exists
      const existing = await this.notificationService.getTemplate(name)
      if (existing) {
        throw new ConflictError(`Template with name "${name}" already exists`)
      }

      const template = await this.notificationService.createTemplate({
        name,
        eventType,
        subject,
        body,
        variables,
      })

      res.status(201).json({
        message: 'Template created successfully',
        template,
      })
    } catch (error) {
      log.error('Error creating template:', error)
      const statusCode = error instanceof ConflictError ? 409 : 500
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Error creating template',
      })
    }
  }

  /**
   * List templates
   * GET /api/notifications/templates
   */
  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const skip = parseInt((req.query.skip as string) || '0', 10)
      const take = parseInt((req.query.take as string) || '10', 10)
      const filters: any = {}
      if (req.query.eventType) filters.eventType = req.query.eventType
      if (req.query.isActive) filters.isActive = req.query.isActive === 'true'

      const { templates, total } = await this.notificationService.listTemplates(filters, skip, take)

      res.status(200).json({
        message: 'Templates retrieved successfully',
        templates,
        total,
        skip,
        take,
      })
    } catch (error) {
      log.error('Error listing templates:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error listing templates',
      })
    }
  }

  /**
   * Get template
   * GET /api/notifications/templates/:templateId
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { templateId } = req.params
      const template = await this.notificationService.getTemplate(templateId)

      if (!template) {
        throw new NotFoundError('Template not found')
      }

      res.status(200).json({
        message: 'Template retrieved successfully',
        template,
      })
    } catch (error) {
      log.error('Error getting template:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error retrieving template',
        })
      }
    }
  }

  /**
   * Update template
   * PUT /api/notifications/templates/:templateId
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { templateId } = req.params
      const template = await this.notificationService.getTemplate(templateId)

      if (!template) {
        throw new NotFoundError('Template not found')
      }

      const updated = await this.notificationService.updateTemplate(templateId, req.body)

      res.status(200).json({
        message: 'Template updated successfully',
        template: updated,
      })
    } catch (error) {
      log.error('Error updating template:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error updating template',
        })
      }
    }
  }

  /**
   * Delete template
   * DELETE /api/notifications/templates/:templateId
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { templateId } = req.params
      const template = await this.notificationService.getTemplate(templateId)

      if (!template) {
        throw new NotFoundError('Template not found')
      }

      const deleted = await this.notificationService.deleteTemplate(templateId)

      res.status(200).json({
        message: 'Template deleted successfully',
        template: deleted,
      })
    } catch (error) {
      log.error('Error deleting template:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error deleting template',
        })
      }
    }
  }

  /**
   * Get notification
   * GET /api/notifications/:notificationId
   */
  async getNotification(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { notificationId } = req.params
      const notification = await this.notificationService.getNotification(notificationId)

      if (!notification) {
        throw new NotFoundError('Notification not found')
      }

      res.status(200).json({
        message: 'Notification retrieved successfully',
        notification,
      })
    } catch (error) {
      log.error('Error getting notification:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error retrieving notification',
        })
      }
    }
  }

  /**
   * Get user notifications
   * GET /api/notifications
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).currentUser?.id

      if (!userId) {
        throw new BadRequestError('User ID is required')
      }

      const skip = parseInt((req.query.skip as string) || '0', 10)
      const take = parseInt((req.query.take as string) || '10', 10)

      const { notifications, total } = await this.notificationService.getUserNotifications(userId, skip, take)

      res.status(200).json({
        message: 'User notifications retrieved successfully',
        notifications,
        total,
        skip,
        take,
      })
    } catch (error) {
      log.error('Error getting user notifications:', error)
      const statusCode = error instanceof BadRequestError ? 400 : 500
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Error retrieving notifications',
      })
    }
  }

  /**
   * Resend notification
   * POST /api/notifications/:notificationId/resend
   */
  async resendNotification(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
        return
      }

      const { notificationId } = req.params
      const notification = await this.notificationService.resendNotification(notificationId)

      if (!notification) {
        throw new NotFoundError('Notification not found')
      }

      res.status(200).json({
        message: 'Notification queued for resending',
        notification,
      })
    } catch (error) {
      log.error('Error resending notification:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error resending notification',
        })
      }
    }
  }
}
