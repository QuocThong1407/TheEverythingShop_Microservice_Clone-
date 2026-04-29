import { PrismaClient, User, UserRole, AccountStatus } from '@prisma/client';
import pino from 'pino';

const logger = pino();
const prisma = new PrismaClient();

export class UserRepository {
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error(error, 'Error finding user by email');
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Error finding user by ID');
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || UserRole.CUSTOMER,
        },
      });
      logger.info({ userId: user.id }, 'User created successfully');
      return user;
    } catch (error) {
      logger.error(error, 'Error creating user');
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      avatar: string;
      status: AccountStatus;
      lastLogin: Date;
    }>
  ): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
      });
      logger.info({ userId: id }, 'User updated successfully');
      return user;
    } catch (error) {
      logger.error(error, 'Error updating user');
      throw error;
    }
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, hashedPassword: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
      logger.info({ userId: id }, 'Password updated successfully');
    } catch (error) {
      logger.error(error, 'Error updating password');
      throw error;
    }
  }

  /**
   * Save refresh token
   */
  static async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      await prisma.refreshToken.create({
        data: {
          token,
          userId,
          expiresAt,
        },
      });
      logger.info({ userId }, 'Refresh token saved');
    } catch (error) {
      logger.error(error, 'Error saving refresh token');
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!refreshToken) {
        return false;
      }

      // Check if token belongs to user and hasn't expired or been revoked
      if (
        refreshToken.userId === userId &&
        refreshToken.expiresAt > new Date() &&
        !refreshToken.revokedAt
      ) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error(error, 'Error verifying refresh token');
      throw error;
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.update({
        where: { token },
        data: { revokedAt: new Date() },
      });
      logger.info('Refresh token revoked');
    } catch (error) {
      logger.error(error, 'Error revoking refresh token');
      throw error;
    }
  }

  /**
   * Create audit log
   */
  static async createAuditLog(data: {
    userId: string;
    action: string;
    resource?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      logger.error(error, 'Error creating audit log');
      // Don't throw - audit logging failures shouldn't break the main flow
    }
  }
}
