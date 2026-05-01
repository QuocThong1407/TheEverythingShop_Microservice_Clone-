import { PrismaClient, Notification, Template, NotificationStatus } from '@prisma/client'

export class TemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    name: string
    eventType: string
    subject: string
    body: string
    variables?: string[]
    isActive?: boolean
  }): Promise<Template> {
    return this.prisma.template.create({
      data: {
        name: data.name,
        eventType: data.eventType,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
      },
    })
  }

  async findById(templateId: string): Promise<Template | null> {
    return this.prisma.template.findUnique({
      where: { id: templateId },
    })
  }

  async findByName(name: string): Promise<Template | null> {
    return this.prisma.template.findUnique({
      where: { name },
    })
  }

  async findByEventType(eventType: string, skip: number, take: number): Promise<Template[]> {
    return this.prisma.template.findMany({
      where: { eventType },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    })
  }

  async list(filters: {
    eventType?: string
    isActive?: boolean
  }, skip: number, take: number): Promise<Template[]> {
    const whereClause: any = {}
    if (filters.eventType) whereClause.eventType = filters.eventType
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive

    return this.prisma.template.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(filters: {
    eventType?: string
    isActive?: boolean
  }): Promise<number> {
    const whereClause: any = {}
    if (filters.eventType) whereClause.eventType = filters.eventType
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive

    return this.prisma.template.count({ where: whereClause })
  }

  async update(templateId: string, data: {
    subject?: string
    body?: string
    variables?: string[]
    isActive?: boolean
  }): Promise<Template> {
    return this.prisma.template.update({
      where: { id: templateId },
      data: {
        subject: data.subject,
        body: data.body,
        variables: data.variables,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    })
  }

  async delete(templateId: string): Promise<Template> {
    return this.prisma.template.delete({
      where: { id: templateId },
    })
  }
}

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    templateId: string
    userId: string
    email: string
    eventId: string
    eventType: string
    subject: string
    body: string
    metadata?: any
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        templateId: data.templateId,
        userId: data.userId,
        email: data.email,
        eventId: data.eventId,
        eventType: data.eventType,
        subject: data.subject,
        body: data.body,
        status: 'PENDING',
        metadata: data.metadata || {},
      },
      include: { template: true },
    })
  }

  async findById(notificationId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { template: true },
    })
  }

  async findByUserId(userId: string, skip: number, take: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      skip,
      take,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async list(filters: {
    userId?: string
    email?: string
    eventType?: string
    status?: NotificationStatus
  }, skip: number, take: number): Promise<Notification[]> {
    const whereClause: any = {}
    if (filters.userId) whereClause.userId = filters.userId
    if (filters.email) whereClause.email = filters.email
    if (filters.eventType) whereClause.eventType = filters.eventType
    if (filters.status) whereClause.status = filters.status

    return this.prisma.notification.findMany({
      where: whereClause,
      skip,
      take,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async count(filters: {
    userId?: string
    email?: string
    eventType?: string
    status?: NotificationStatus
  }): Promise<number> {
    const whereClause: any = {}
    if (filters.userId) whereClause.userId = filters.userId
    if (filters.email) whereClause.email = filters.email
    if (filters.eventType) whereClause.eventType = filters.eventType
    if (filters.status) whereClause.status = filters.status

    return this.prisma.notification.count({ where: whereClause })
  }

  async updateStatus(notificationId: string, status: NotificationStatus): Promise<Notification> {
    const data: any = { status, updatedAt: new Date() }
    if (status === 'SENT') {
      data.sentAt = new Date()
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data,
      include: { template: true },
    })
  }

  async incrementRetry(notificationId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        retryCount: { increment: 1 },
        updatedAt: new Date(),
      },
      include: { template: true },
    })
  }

  async setError(notificationId: string, error: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        errorMessage: error,
        updatedAt: new Date(),
      },
      include: { template: true },
    })
  }

  async findPendingNotifications(limit: number = 100): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: 3 },
      },
      take: limit,
      include: { template: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findFailedNotifications(skip: number, take: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { status: 'FAILED' },
      skip,
      take,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    })
  }
}
