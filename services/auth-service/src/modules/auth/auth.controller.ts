import { Request, Response } from 'express';
import pino from 'pino';
import { AuthService } from './auth.service';

const logger = pino();

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export class AuthController {
  /**
   * POST /api/auth/signup
   * Register new user
   */
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await AuthService.signup({
        email,
        password,
        firstName,
        lastName,
      });

      // Set refresh token as HTTP-only cookie (optional for security)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      logger.error(error, 'Error in signup controller');
      throw error;
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      logger.error(error, 'Error in login controller');
      throw error;
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const newAccessToken = await AuthService.refreshAccessToken(
        req.currentUser.id,
        refreshToken
      );

      res.status(200).json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
      });
    } catch (error) {
      logger.error(error, 'Error in refresh controller');
      throw error;
    }
  }

  /**
   * POST /api/auth/logout
   * Log out user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      await AuthService.logout(refreshToken, req.currentUser.id);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.status(200).json({
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error(error, 'Error in logout controller');
      throw error;
    }
  }

  /**
   * GET /api/auth/profile
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const profile = await AuthService.getProfile(req.currentUser.id);

      res.status(200).json({
        message: 'Profile retrieved successfully',
        user: profile,
      });
    } catch (error) {
      logger.error(error, 'Error in getProfile controller');
      throw error;
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      await AuthService.changePassword(req.currentUser.id, currentPassword, newPassword);

      res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error(error, 'Error in changePassword controller');
      throw error;
    }
  }

  /**
   * POST /api/auth/verify-token
   * Verify access token (for internal services)
   */
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        res.status(401).json({
          message: 'Invalid token',
          valid: false,
        });
        return;
      }

      res.status(200).json({
        message: 'Token is valid',
        valid: true,
        user: req.currentUser,
      });
    } catch (error) {
      logger.error(error, 'Error in verifyToken controller');
      throw error;
    }
  }
}
