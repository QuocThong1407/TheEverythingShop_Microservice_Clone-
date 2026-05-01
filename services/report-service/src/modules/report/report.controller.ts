import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import logger from 'pino'
import { ReportService } from './report.service.js'
import { NotFoundError, BadRequestError, InternalServerError } from '@teleshop/common/errors'

const log = logger()

export class ReportController {
  constructor(private reportService: ReportService) {}

  /**
   * Generate a new report
   * POST /api/reports
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'field' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const { name, type, period, startDate, endDate, filters, description } = req.body
      const userId = (req as any).currentUser?.id

      if (!userId) {
        throw new BadRequestError('User ID is required')
      }

      const report = await this.reportService.generateReport({
        name,
        type,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: userId,
        filters,
        description,
      })

      res.status(201).json({
        message: 'Report generated successfully',
        report,
      })
    } catch (error) {
      log.error('Error generating report:', error)
      const statusCode = error instanceof BadRequestError ? 400 : 500
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Error generating report',
      })
    }
  }

  /**
   * List reports
   * GET /api/reports
   */
  async listReports(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'query' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const skip = parseInt((req.query.skip as string) || '0', 10)
      const take = parseInt((req.query.take as string) || '10', 10)

      const filters: any = {}
      if (req.query.type) filters.type = req.query.type
      if (req.query.period) filters.period = req.query.period
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string)
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string)

      const { reports, total } = await this.reportService.listReports(filters, skip, take)

      res.status(200).json({
        message: 'Reports retrieved successfully',
        reports,
        total,
        skip,
        take,
      })
    } catch (error) {
      log.error('Error listing reports:', error)
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error listing reports',
      })
    }
  }

  /**
   * Get a specific report
   * GET /api/reports/:reportId
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'param' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const { reportId } = req.params

      const report = await this.reportService.getReport(reportId)

      if (!report) {
        throw new NotFoundError('Report not found')
      }

      res.status(200).json({
        message: 'Report retrieved successfully',
        report,
      })
    } catch (error) {
      log.error('Error getting report:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({
          message: error.message,
        })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error retrieving report',
        })
      }
    }
  }

  /**
   * Get metrics for a report
   * GET /api/reports/:reportId/metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'param' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const { reportId } = req.params

      // Verify report exists
      const report = await this.reportService.getReport(reportId)
      if (!report) {
        throw new NotFoundError('Report not found')
      }

      const metrics = await this.reportService.getReportMetrics(reportId)

      res.status(200).json({
        message: 'Metrics retrieved successfully',
        reportId,
        metrics,
        count: metrics.length,
      })
    } catch (error) {
      log.error('Error getting metrics:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({
          message: error.message,
        })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error retrieving metrics',
        })
      }
    }
  }

  /**
   * Delete a report (Admin only)
   * DELETE /api/reports/:reportId
   */
  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(422).json({
          message: 'Validation failed',
          errors: errors.array().map(e => ({
            field: e.type === 'param' ? (e as any).path : 'unknown',
            message: e.msg,
          })),
        })
        return
      }

      const { reportId } = req.params

      // Verify report exists
      const report = await this.reportService.getReport(reportId)
      if (!report) {
        throw new NotFoundError('Report not found')
      }

      const deletedReport = await this.reportService.deleteReport(reportId)

      res.status(200).json({
        message: 'Report deleted successfully',
        report: deletedReport,
      })
    } catch (error) {
      log.error('Error deleting report:', error)
      if (error instanceof NotFoundError) {
        res.status(404).json({
          message: error.message,
        })
      } else {
        res.status(500).json({
          message: error instanceof Error ? error.message : 'Error deleting report',
        })
      }
    }
  }

  /**
   * Get recent reports
   * GET /api/reports/recent
   */
  async getRecentReports(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt((req.query.limit as string) || '10', 10)

      if (limit < 1 || limit > 100) {
        throw new BadRequestError('Limit must be between 1 and 100')
      }

      const reports = await this.reportService.getRecentReports(limit)

      res.status(200).json({
        message: 'Recent reports retrieved successfully',
        reports,
        count: reports.length,
      })
    } catch (error) {
      log.error('Error getting recent reports:', error)
      const statusCode = error instanceof BadRequestError ? 400 : 500
      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Error retrieving recent reports',
      })
    }
  }
}
