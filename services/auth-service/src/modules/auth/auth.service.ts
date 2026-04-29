import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import { UserRole } from '@prisma/client';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  DatabaseConnectionError,
} from '@teleshop/common/errors';
import { getRabbitMQService, EventMessage } from '@teleshop/common/rabbitmq';
import { AuthEvents } from '@teleshop/common/events';
import { UserRepository } from './auth.repository';

const logger = pino();

export interface JwtPayloadData {
  id: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
  private static readonly ACCESS_TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours

  /**
   * Hash password using bcrypt
   */
  private static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error(error, 'Error hashing password');
      throw new DatabaseConnectionError('Failed to hash password');
    }
  }

  /**
   * Compare password with hash
   */
  private static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error(error, 'Error comparing password');
      throw new DatabaseConnectionError('Failed to compare password');
    }
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(userId: string, email: string, role: UserRole): string {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const expiresIn = process.env.JWT_EXPIRY || '24h';

    return jwt.sign(
      {
        id: userId,
        email,
        role,
      },
      secret,
      { expiresIn }
    );
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'dev-secret';

    return jwt.sign(
      {
        id: userId,
      },
      secret,
      { expiresIn: `${this.REFRESH_TOKEN_EXPIRY}s` }
    );
  }

  /**
   * Publish user event to RabbitMQ
   */
  private static async publishUserEvent(eventType: string, data: any): Promise<void> {
    try {
      const rmq = getRabbitMQService();
      const eventMessage: EventMessage = {
        id: `${Date.now()}-${Math.random()}`,
        type: eventType,
        aggregateId: data.userId,
        aggregateType: 'User',
        data,
        timestamp: new Date(),
        version: 1,
        source: 'auth-service',
      };

      await rmq.publish(eventType, eventMessage);
      logger.info({ eventType, userId: data.userId }, 'User event published');
    } catch (error) {
      logger.error(error, 'Error publishing user event');
      // Don't throw - event publishing failure shouldn't break signup/login
    }
  }

  /**
   * Sign up new user
   */
  static async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    try {
      const existingUser = await UserRepository.findByEmail(data.email);

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const hashedPassword = await this.hashPassword(data.password);

      const user = await UserRepository.create({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.CUSTOMER,
      });

      const accessToken = this.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id);

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000);
      await UserRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

      // Publish USER_REGISTERED event
      await this.publishUserEvent(AuthEvents.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });

      // Create audit log
      await UserRepository.createAuditLog({
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: 'User',
      });

      logger.info({ userId: user.id }, 'User signed up successfully');

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(error, 'Error during signup');
      throw error;
    }
  }

  /**
   * Log in user
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const user = await UserRepository.findByEmail(email);

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isPasswordValid = await this.comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (user.status !== 'ACTIVE') {
        throw new BadRequestError(`Account is ${user.status}`);
      }

      const accessToken = this.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id);

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY * 1000);
      await UserRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

      // Update last login
      await UserRepository.update(user.id, {
        lastLogin: new Date(),
      });

      // Publish USER_LOGIN event
      await this.publishUserEvent(AuthEvents.USER_LOGIN, {
        userId: user.id,
        email: user.email,
      });

      // Create audit log
      await UserRepository.createAuditLog({
        userId: user.id,
        action: 'USER_LOGIN',
      });

      logger.info({ userId: user.id }, 'User logged in successfully');

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(error, 'Error during login');
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    try {
      const isValid = await UserRepository.verifyRefreshToken(userId, refreshToken);

      if (!isValid) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      const user = await UserRepository.findById(userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return this.generateAccessToken(user.id, user.email, user.role);
    } catch (error) {
      logger.error(error, 'Error refreshing access token');
      throw error;
    }
  }

  /**
   * Log out user (revoke refresh token)
   */
  static async logout(refreshToken: string, userId: string): Promise<void> {
    try {
      await UserRepository.revokeRefreshToken(refreshToken);

      // Publish USER_LOGOUT event
      await this.publishUserEvent(AuthEvents.USER_LOGOUT, {
        userId,
      });

      // Create audit log
      await UserRepository.createAuditLog({
        userId,
        action: 'USER_LOGOUT',
      });

      logger.info({ userId }, 'User logged out successfully');
    } catch (error) {
      logger.error(error, 'Error during logout');
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await UserRepository.findById(userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const isPasswordValid = await this.comparePassword(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      const hashedNewPassword = await this.hashPassword(newPassword);
      await UserRepository.updatePassword(userId, hashedNewPassword);

      // Create audit log
      await UserRepository.createAuditLog({
        userId,
        action: 'PASSWORD_CHANGED',
      });

      logger.info({ userId }, 'Password changed successfully');
    } catch (error) {
      logger.error(error, 'Error changing password');
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string) {
    try {
      const user = await UserRepository.findById(userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error(error, 'Error getting user profile');
      throw error;
    }
  }
}
