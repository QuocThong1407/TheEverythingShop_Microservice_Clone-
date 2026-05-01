import { body, param, query } from 'express-validator'
import { ReportType, ReportPeriod } from '../generated/client/index.js'

const validReportTypes = Object.values(ReportType)
const validPeriods = Object.values(ReportPeriod)

export const validateCreateReport = [
  body('name')
    .trim()
    .notEmpty().withMessage('Report name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Report name must be 3-255 characters'),

  body('type')
    .notEmpty().withMessage('Report type is required')
    .isIn(validReportTypes).withMessage(`Report type must be one of: ${validReportTypes.join(', ')}`),

  body('period')
    .notEmpty().withMessage('Report period is required')
    .isIn(validPeriods).withMessage(`Report period must be one of: ${validPeriods.join(', ')}`),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be ISO8601 format')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Start date cannot be in the future')
      }
      return true
    }),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be ISO8601 format')
    .custom((value, { req }) => {
      if (new Date(value) > new Date()) {
        throw new Error('End date cannot be in the future')
      }
      if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),

  body('filters')
    .optional()
    .isObject().withMessage('Filters must be an object'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be 500 characters or less'),
]

export const validateListReports = [
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),

  query('take')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Take must be between 1 and 100'),

  query('type')
    .optional()
    .isIn(validReportTypes).withMessage(`Type must be one of: ${validReportTypes.join(', ')}`),

  query('period')
    .optional()
    .isIn(validPeriods).withMessage(`Period must be one of: ${validPeriods.join(', ')}`),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be ISO8601 format'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be ISO8601 format'),
]

export const validateGetReport = [
  param('reportId')
    .isUUID().withMessage('Report ID must be a valid UUID'),
]

export const validateGenerateReport = [
  body('name')
    .trim()
    .notEmpty().withMessage('Report name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Report name must be 3-255 characters'),

  body('type')
    .notEmpty().withMessage('Report type is required')
    .isIn(validReportTypes).withMessage(`Report type must be one of: ${validReportTypes.join(', ')}`),

  body('period')
    .notEmpty().withMessage('Report period is required')
    .isIn(validPeriods).withMessage(`Report period must be one of: ${validPeriods.join(', ')}`),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be ISO8601 format'),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be ISO8601 format'),

  body('filters')
    .optional()
    .isObject().withMessage('Filters must be an object'),
]

export const validateGetMetrics = [
  param('reportId')
    .isUUID().withMessage('Report ID must be a valid UUID'),
]

export const validateDeleteReport = [
  param('reportId')
    .isUUID().withMessage('Report ID must be a valid UUID'),
]
