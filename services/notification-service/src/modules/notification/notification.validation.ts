import { body, param, query } from 'express-validator'
import { NotificationStatus } from '@prisma/client'

const validStatuses = Object.values(NotificationStatus)

export const validateCreateTemplate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Template name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Template name must be 3-100 characters')
    .isAlphanumeric('en-US', { ignore: '_-' }).withMessage('Template name must be alphanumeric with underscores/hyphens'),

  body('eventType')
    .trim()
    .notEmpty().withMessage('Event type is required')
    .isLength({ max: 100 }).withMessage('Event type must be 100 characters or less'),

  body('subject')
    .trim()
    .notEmpty().withMessage('Email subject is required')
    .isLength({ min: 5, max: 255 }).withMessage('Subject must be 5-255 characters'),

  body('body')
    .trim()
    .notEmpty().withMessage('Email body is required')
    .isLength({ min: 10 }).withMessage('Email body must be at least 10 characters'),

  body('variables')
    .optional()
    .isArray().withMessage('Variables must be an array'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be boolean'),
]

export const validateUpdateTemplate = [
  param('templateId')
    .isUUID().withMessage('Template ID must be a valid UUID'),

  body('subject')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 }).withMessage('Subject must be 5-255 characters'),

  body('body')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Email body must be at least 10 characters'),

  body('variables')
    .optional()
    .isArray().withMessage('Variables must be an array'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be boolean'),
]

export const validateGetTemplate = [
  param('templateId')
    .isUUID().withMessage('Template ID must be a valid UUID'),
]

export const validateListTemplates = [
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('Skip must be non-negative'),

  query('take')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Take must be 1-100'),

  query('eventType')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Event type must be 100 characters or less'),

  query('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be boolean'),
]

export const validateGetNotification = [
  param('notificationId')
    .isUUID().withMessage('Notification ID must be a valid UUID'),
]

export const validateListNotifications = [
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('Skip must be non-negative'),

  query('take')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Take must be 1-100'),

  query('userId')
    .optional()
    .isUUID().withMessage('User ID must be a valid UUID'),

  query('status')
    .optional()
    .isIn(validStatuses).withMessage(`Status must be one of: ${validStatuses.join(', ')}`),

  query('eventType')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Event type must be 100 characters or less'),
]

export const validateResendNotification = [
  param('notificationId')
    .isUUID().withMessage('Notification ID must be a valid UUID'),
]

export const validateDeleteTemplate = [
  param('templateId')
    .isUUID().withMessage('Template ID must be a valid UUID'),
]
