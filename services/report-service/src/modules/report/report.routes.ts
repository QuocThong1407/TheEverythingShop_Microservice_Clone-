import { Router } from 'express'
import { requireAuth, requireRole } from '@teleshop/common/middleware'
import {
  validateCreateReport,
  validateListReports,
  validateGetReport,
  validateGenerateReport,
  validateGetMetrics,
  validateDeleteReport,
} from './report.validation.js'
import { ReportController } from './report.controller.js'
import { ReportService } from './report.service.js'
import { PrismaClient } from '@prisma/client'
import { RabbitMQService } from '@teleshop/common/rabbitmq'

export function createReportRoutes(
  prisma: PrismaClient,
  rabbit: RabbitMQService
): Router {
  const router = Router()
  const reportService = new ReportService(prisma, rabbit)
  const controller = new ReportController(reportService)

  /**
   * Generate a new report
   * POST /api/reports/generate
   * Auth: Required, Admin: Optional
   */
  router.post(
    '/generate',
    requireAuth,
    validateGenerateReport,
    (req, res) => controller.generateReport(req, res)
  )

  /**
   * List reports
   * GET /api/reports
   * Auth: Required
   */
  router.get(
    '/',
    requireAuth,
    validateListReports,
    (req, res) => controller.listReports(req, res)
  )

  /**
   * Get recent reports
   * GET /api/reports/recent
   * Auth: Required
   */
  router.get(
    '/recent',
    requireAuth,
    (req, res) => controller.getRecentReports(req, res)
  )

  /**
   * Get a specific report
   * GET /api/reports/:reportId
   * Auth: Required
   */
  router.get(
    '/:reportId',
    requireAuth,
    validateGetReport,
    (req, res) => controller.getReport(req, res)
  )

  /**
   * Get metrics for a report
   * GET /api/reports/:reportId/metrics
   * Auth: Required
   */
  router.get(
    '/:reportId/metrics',
    requireAuth,
    validateGetMetrics,
    (req, res) => controller.getMetrics(req, res)
  )

  /**
   * Delete a report
   * DELETE /api/reports/:reportId
   * Auth: Required, Admin: Required
   */
  router.delete(
    '/:reportId',
    requireAuth,
    requireRole('ADMIN'),
    validateDeleteReport,
    (req, res) => controller.deleteReport(req, res)
  )

  return router
}
