import { PrismaClient } from '@prisma/client'
import logger from '@teleshop/common/logger'

const prisma = new PrismaClient()

prisma.$connect()
  .then(() => logger.info('Database connected'))
  .catch((error) => {
    logger.error(`Database connection failed: ${error}`)
    process.exit(1)
  })

export { prisma }
