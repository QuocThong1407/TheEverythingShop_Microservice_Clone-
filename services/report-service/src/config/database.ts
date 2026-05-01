import { PrismaClient } from '@prisma/client'
import logger from 'pino'

const log = logger()

let prisma: PrismaClient

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function initializeDatabase(): Promise<PrismaClient> {
  try {
    prisma = new PrismaClient()
    
    // Test connection
    await prisma.$connect()
    log.info('Database connected successfully')
    
    return prisma
  } catch (error) {
    log.error('Failed to connect to database:', error)
    process.exit(1)
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    log.info('Database disconnected')
  }
}
