import { Report, ReportType, ReportPeriod, ReportStatus, Metric } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { RabbitMQService } from '@teleshop/common/rabbitmq'
import logger from 'pino'
import { ReportRepository, MetricRepository } from './report.repository.js'

const log = logger()

interface EventData {
  id: string
  type: string
  aggregateId: string
  data: any
  timestamp: Date
}

interface AggregatedMetrics {
  [key: string]: number | string | object
}

export class ReportService {
  private reportRepo: ReportRepository
  private metricRepo: MetricRepository
  private aggregatedData: Map<string, AggregatedMetrics> = new Map()
  private eventLog: EventData[] = []

  constructor(
    private prisma: PrismaClient,
    private rabbit: RabbitMQService
  ) {
    this.reportRepo = new ReportRepository(prisma)
    this.metricRepo = new MetricRepository(prisma)
  }

  /**
   * Initialize event subscriptions for real-time data aggregation
   */
  async subscribeToEvents(): Promise<void> {
    try {
      // Subscribe to all event types with wildcard pattern
      const patterns = [
        'user.*',
        'order.*',
        'payment.*',
        'cart.*',
        'product.*',
        'review.*',
        'return.*',
        'promotion.*',
        'inventory.*',
      ]

      await this.rabbit.subscribe('report-service-events-queue', patterns, async (event) => {
        await this.aggregateEventData(event)
      })

      log.info('Report Service subscribed to all event types')
    } catch (error) {
      log.error('Failed to subscribe to events:', error)
      throw error
    }
  }

  /**
   * Aggregate event data for real-time analytics
   */
  private async aggregateEventData(event: EventData): Promise<void> {
    try {
      this.eventLog.push(event)

      // Keep only last 1000 events in memory
      if (this.eventLog.length > 1000) {
        this.eventLog = this.eventLog.slice(-1000)
      }

      // Aggregate by event type
      const key = `${event.type}_${new Date().toISOString().split('T')[0]}`

      if (!this.aggregatedData.has(key)) {
        this.aggregatedData.set(key, {
          event_count: 0,
          first_event_at: event.timestamp,
          last_event_at: event.timestamp,
          event_types: {},
        })
      }

      const metrics = this.aggregatedData.get(key)!
      metrics.event_count = (metrics.event_count as number) + 1
      metrics.last_event_at = event.timestamp
      if (!metrics.event_types) metrics.event_types = {}
      (metrics.event_types as any)[event.type] = ((metrics.event_types as any)[event.type] || 0) + 1

      // Handle specific event types for detailed metrics
      switch (event.type) {
        case 'ORDER_CREATED':
          this.aggregateOrderMetrics(event, metrics)
          break
        case 'PAYMENT_SUCCESS':
        case 'PAYMENT_FAILED':
          this.aggregatePaymentMetrics(event, metrics)
          break
        case 'USER_REGISTERED':
          this.aggregateUserMetrics(event, metrics)
          break
        case 'REVIEW_SUBMITTED':
          this.aggregateReviewMetrics(event, metrics)
          break
        case 'RETURN_CREATED':
        case 'RETURN_COMPLETED':
          this.aggregateReturnMetrics(event, metrics)
          break
      }
    } catch (error) {
      log.error('Error aggregating event data:', error)
    }
  }

  private aggregateOrderMetrics(event: EventData, metrics: AggregatedMetrics): void {
    metrics.order_count = ((metrics.order_count as number) || 0) + 1
    if (event.data.amount) {
      metrics.total_order_value = ((metrics.total_order_value as number) || 0) + event.data.amount
      metrics.avg_order_value = (metrics.total_order_value as number) / (metrics.order_count as number)
    }
  }

  private aggregatePaymentMetrics(event: EventData, metrics: AggregatedMetrics): void {
    if (event.type === 'PAYMENT_SUCCESS') {
      metrics.payment_success_count = ((metrics.payment_success_count as number) || 0) + 1
      if (event.data.amount) {
        metrics.total_revenue = ((metrics.total_revenue as number) || 0) + event.data.amount
      }
    } else if (event.type === 'PAYMENT_FAILED') {
      metrics.payment_failed_count = ((metrics.payment_failed_count as number) || 0) + 1
    }
  }

  private aggregateUserMetrics(event: EventData, metrics: AggregatedMetrics): void {
    metrics.new_users_count = ((metrics.new_users_count as number) || 0) + 1
  }

  private aggregateReviewMetrics(event: EventData, metrics: AggregatedMetrics): void {
    metrics.review_count = ((metrics.review_count as number) || 0) + 1
    if (event.data.rating) {
      metrics.total_rating = ((metrics.total_rating as number) || 0) + event.data.rating
      metrics.avg_rating = (metrics.total_rating as number) / (metrics.review_count as number)
    }
  }

  private aggregateReturnMetrics(event: EventData, metrics: AggregatedMetrics): void {
    if (event.type === 'RETURN_CREATED') {
      metrics.return_initiated_count = ((metrics.return_initiated_count as number) || 0) + 1
    } else if (event.type === 'RETURN_COMPLETED') {
      metrics.return_completed_count = ((metrics.return_completed_count as number) || 0) + 1
    }
  }

  /**
   * Generate a report with aggregated metrics
   */
  async generateReport(data: {
    name: string
    type: ReportType
    period: ReportPeriod
    startDate: Date
    endDate: Date
    createdBy: string
    filters?: any
    description?: string
  }): Promise<Report> {
    try {
      // Create report record
      const report = await this.reportRepo.create({
        ...data,
        eventTypes: this.getEventTypesForReportType(data.type),
        dataSource: 'events',
      })

      // Generate metrics based on report type
      const metricsData = this.calculateMetricsForReport(data.type, data.startDate, data.endDate)

      // Store metrics
      if (metricsData.length > 0) {
        const metrics = metricsData.map(m => ({
          reportId: report.id,
          metricName: m.name,
          value: m.value,
          unit: m.unit,
          metadata: m.metadata,
        }))

        await this.metricRepo.createMany(metrics)
      }

      // Update report with metric count
      const updatedReport = await this.reportRepo.update(report.id, {})

      log.info(`Report ${report.id} generated successfully with ${metricsData.length} metrics`)

      return updatedReport
    } catch (error) {
      log.error('Error generating report:', error)
      throw error
    }
  }

  /**
   * Get a specific report with all metrics
   */
  async getReport(reportId: string): Promise<Report | null> {
    return this.reportRepo.findById(reportId)
  }

  /**
   * List reports with filters
   */
  async listReports(
    filters: {
      type?: ReportType
      period?: ReportPeriod
      startDate?: Date
      endDate?: Date
    },
    skip: number,
    take: number
  ): Promise<{ reports: Report[]; total: number }> {
    const [reports, total] = await Promise.all([
      this.reportRepo.list(filters, skip, take),
      this.reportRepo.count(filters),
    ])

    return { reports, total }
  }

  /**
   * Get metrics for a report
   */
  async getReportMetrics(reportId: string): Promise<Metric[]> {
    return this.metricRepo.findByReportId(reportId)
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<Report> {
    // Metrics will be deleted cascade
    return this.reportRepo.delete(reportId)
  }

  /**
   * Get recent reports
   */
  async getRecentReports(limit: number = 10): Promise<Report[]> {
    return this.reportRepo.findRecent(limit)
  }

  /**
   * Calculate metrics based on report type
   */
  private calculateMetricsForReport(
    type: ReportType,
    startDate: Date,
    endDate: Date
  ): Array<{ name: string; value: number; unit: string; metadata?: any }> {
    const metrics: Array<{ name: string; value: number; unit: string; metadata?: any }> = []

    // Filter aggregated data by date range
    const relevantData = this.eventLog.filter(e => 
      e.timestamp >= startDate && e.timestamp <= endDate
    )

    switch (type) {
      case 'SALES':
        metrics.push(
          { name: 'total_revenue', value: this.sumMetric(relevantData, 'total_revenue'), unit: 'VND' },
          { name: 'order_count', value: this.sumMetric(relevantData, 'order_count'), unit: 'count' },
          { name: 'avg_order_value', value: this.avgMetric(relevantData, 'avg_order_value'), unit: 'VND' }
        )
        break

      case 'ORDERS':
        metrics.push(
          { name: 'total_orders', value: this.sumMetric(relevantData, 'order_count'), unit: 'count' },
          { name: 'avg_order_value', value: this.avgMetric(relevantData, 'avg_order_value'), unit: 'VND' }
        )
        break

      case 'USERS':
        metrics.push(
          { name: 'new_users', value: this.sumMetric(relevantData, 'new_users_count'), unit: 'count' }
        )
        break

      case 'PAYMENTS':
        metrics.push(
          { name: 'successful_payments', value: this.sumMetric(relevantData, 'payment_success_count'), unit: 'count' },
          { name: 'failed_payments', value: this.sumMetric(relevantData, 'payment_failed_count'), unit: 'count' },
          { name: 'total_revenue', value: this.sumMetric(relevantData, 'total_revenue'), unit: 'VND' }
        )
        break

      case 'RETURNS':
        metrics.push(
          { name: 'returns_initiated', value: this.sumMetric(relevantData, 'return_initiated_count'), unit: 'count' },
          { name: 'returns_completed', value: this.sumMetric(relevantData, 'return_completed_count'), unit: 'count' }
        )
        break

      case 'REVIEWS':
        metrics.push(
          { name: 'review_count', value: this.sumMetric(relevantData, 'review_count'), unit: 'count' },
          { name: 'avg_rating', value: this.avgMetric(relevantData, 'avg_rating'), unit: 'rating' }
        )
        break

      case 'CUSTOM':
      default:
        metrics.push({
          name: 'total_events',
          value: relevantData.length,
          unit: 'count',
          metadata: { event_types: Object.fromEntries(relevantData.reduce((acc, e) => {
            const existing = acc.get(e.type) || 0
            acc.set(e.type, existing + 1)
            return acc
          }, new Map())) },
        })
        break
    }

    return metrics
  }

  private sumMetric(data: EventData[], field: string): number {
    return data.reduce((sum, e) => sum + ((e.data[field] as number) || 0), 0)
  }

  private avgMetric(data: EventData[], field: string): number {
    if (data.length === 0) return 0
    const sum = this.sumMetric(data, field)
    return sum / data.length
  }

  private getEventTypesForReportType(type: ReportType): string[] {
    const eventMapping: Record<ReportType, string[]> = {
      SALES: ['ORDER_CREATED', 'PAYMENT_SUCCESS'],
      ORDERS: ['ORDER_CREATED', 'ORDER_COMPLETED', 'ORDER_CANCELLED'],
      USERS: ['USER_REGISTERED', 'USER_UPDATED'],
      PAYMENTS: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REFUND_COMPLETED'],
      INVENTORY: ['PRODUCT_UPDATED', 'INVENTORY_ADJUSTED'],
      RETURNS: ['RETURN_CREATED', 'RETURN_COMPLETED'],
      REVIEWS: ['REVIEW_SUBMITTED', 'REVIEW_UPDATED'],
      CUSTOM: [],
    }

    return eventMapping[type] || []
  }
}
