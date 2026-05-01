import { PrismaClient, Report, Metric, ReportType, ReportPeriod, ReportStatus } from '@prisma/client'

export class ReportRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    name: string
    type: ReportType
    period: ReportPeriod
    startDate: Date
    endDate: Date
    createdBy: string
    filters?: any
    description?: string
    eventTypes?: string[]
    dataSource?: string
  }): Promise<Report> {
    return this.prisma.report.create({
      data: {
        name: data.name,
        type: data.type,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: data.createdBy,
        filters: data.filters || {},
        description: data.description,
        eventTypes: data.eventTypes || [],
        dataSource: data.dataSource || 'events',
        status: 'COMPLETED',
      },
      include: { metrics: true },
    })
  }

  async findById(reportId: string): Promise<Report | null> {
    return this.prisma.report.findUnique({
      where: { id: reportId },
      include: { metrics: true },
    })
  }

  async findByType(type: ReportType, skip: number, take: number): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { type },
      skip,
      take,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByPeriod(period: ReportPeriod, skip: number, take: number): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { period },
      skip,
      take,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByDateRange(startDate: Date, endDate: Date, skip: number, take: number): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      skip,
      take,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async list(filters: {
    type?: ReportType
    period?: ReportPeriod
    startDate?: Date
    endDate?: Date
    status?: ReportStatus
  }, skip: number, take: number): Promise<Report[]> {
    const whereClause: any = {}

    if (filters.type) whereClause.type = filters.type
    if (filters.period) whereClause.period = filters.period
    if (filters.status) whereClause.status = filters.status

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate
    }

    return this.prisma.report.findMany({
      where: whereClause,
      skip,
      take,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(filters: {
    type?: ReportType
    period?: ReportPeriod
    startDate?: Date
    endDate?: Date
    status?: ReportStatus
  }): Promise<number> {
    const whereClause: any = {}

    if (filters.type) whereClause.type = filters.type
    if (filters.period) whereClause.period = filters.period
    if (filters.status) whereClause.status = filters.status

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate
    }

    return this.prisma.report.count({ where: whereClause })
  }

  async update(reportId: string, data: {
    name?: string
    status?: ReportStatus
    description?: string
  }): Promise<Report> {
    return this.prisma.report.update({
      where: { id: reportId },
      data,
      include: { metrics: true },
    })
  }

  async updateStatus(reportId: string, status: ReportStatus): Promise<Report> {
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status, updatedAt: new Date() },
      include: { metrics: true },
    })
  }

  async delete(reportId: string): Promise<Report> {
    return this.prisma.report.delete({
      where: { id: reportId },
    })
  }

  async findRecent(limit: number = 10): Promise<Report[]> {
    return this.prisma.report.findMany({
      take: limit,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByCreator(createdBy: string, skip: number, take: number): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { createdBy },
      skip,
      take,
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export class MetricRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    reportId: string
    metricName: string
    value: number
    unit: string
    metadata?: any
  }): Promise<Metric> {
    return this.prisma.metric.create({
      data: {
        reportId: data.reportId,
        metricName: data.metricName,
        value: data.value,
        unit: data.unit,
        metadata: data.metadata || {},
      },
    })
  }

  async createMany(metrics: Array<{
    reportId: string
    metricName: string
    value: number
    unit: string
    metadata?: any
  }>): Promise<Metric[]> {
    const created = await Promise.all(
      metrics.map(m => this.create(m))
    )
    return created
  }

  async findByReportId(reportId: string): Promise<Metric[]> {
    return this.prisma.metric.findMany({
      where: { reportId },
      orderBy: { metricName: 'asc' },
    })
  }

  async findByMetricName(metricName: string, skip: number, take: number): Promise<Metric[]> {
    return this.prisma.metric.findMany({
      where: { metricName },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(metricId: string): Promise<Metric | null> {
    return this.prisma.metric.findUnique({
      where: { id: metricId },
    })
  }

  async deleteByReportId(reportId: string): Promise<number> {
    const result = await this.prisma.metric.deleteMany({
      where: { reportId },
    })
    return result.count
  }

  async count(reportId: string): Promise<number> {
    return this.prisma.metric.count({
      where: { reportId },
    })
  }
}
