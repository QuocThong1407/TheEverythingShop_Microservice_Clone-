import { Request, Response } from 'express';
import pino from 'pino';
import { AccountService } from './account.service';

const logger = pino();

export class AccountController {
  /**
   * GET /api/account/profile
   * Get user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const profile = await AccountService.getProfile(req.currentUser.id);

      res.status(200).json({
        message: 'Profile retrieved successfully',
        profile,
      });
    } catch (error) {
      logger.error(error, 'Error in getProfile');
      throw error;
    }
  }

  /**
   * POST /api/account/profile
   * Create user profile (for manual profile creation if needed)
   */
  static async createProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const { firstName, lastName } = req.body;

      const profile = await AccountService.createProfile(req.currentUser.id, {
        firstName,
        lastName,
        email: req.currentUser.email,
      });

      res.status(201).json({
        message: 'Profile created successfully',
        profile,
      });
    } catch (error) {
      logger.error(error, 'Error in createProfile');
      throw error;
    }
  }

  /**
   * PUT /api/account/profile
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const profile = await AccountService.updateProfile(req.currentUser.id, req.body);

      res.status(200).json({
        message: 'Profile updated successfully',
        profile,
      });
    } catch (error) {
      logger.error(error, 'Error in updateProfile');
      throw error;
    }
  }

  /**
   * GET /api/account/addresses
   * Get all user addresses
   */
  static async getAddresses(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const addresses = await AccountService.getAddresses(req.currentUser.id);

      res.status(200).json({
        message: 'Addresses retrieved successfully',
        addresses,
      });
    } catch (error) {
      logger.error(error, 'Error in getAddresses');
      throw error;
    }
  }

  /**
   * POST /api/account/addresses
   * Add new address
   */
  static async addAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const address = await AccountService.addAddress(req.currentUser.id, req.body);

      res.status(201).json({
        message: 'Address added successfully',
        address,
      });
    } catch (error) {
      logger.error(error, 'Error in addAddress');
      throw error;
    }
  }

  /**
   * PUT /api/account/addresses/:addressId
   * Update address
   */
  static async updateAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const { addressId } = req.params;
      const address = await AccountService.updateAddress(addressId, req.currentUser.id, req.body);

      res.status(200).json({
        message: 'Address updated successfully',
        address,
      });
    } catch (error) {
      logger.error(error, 'Error in updateAddress');
      throw error;
    }
  }

  /**
   * DELETE /api/account/addresses/:addressId
   * Delete address
   */
  static async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const { addressId } = req.params;
      await AccountService.deleteAddress(addressId, req.currentUser.id);

      res.status(200).json({
        message: 'Address deleted successfully',
      });
    } catch (error) {
      logger.error(error, 'Error in deleteAddress');
      throw error;
    }
  }

  /**
   * POST /api/account/addresses/:addressId/set-default
   * Set address as default
   */
  static async setDefaultAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const { addressId } = req.params;
      await AccountService.setDefaultAddress(addressId, req.currentUser.id);

      res.status(200).json({
        message: 'Default address set successfully',
      });
    } catch (error) {
      logger.error(error, 'Error in setDefaultAddress');
      throw error;
    }
  }

  /**
   * GET /api/account/preferences
   * Get user preferences
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const preferences = await AccountService.getPreferences(req.currentUser.id);

      res.status(200).json({
        message: 'Preferences retrieved successfully',
        preferences,
      });
    } catch (error) {
      logger.error(error, 'Error in getPreferences');
      throw error;
    }
  }

  /**
   * PUT /api/account/preferences
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const preferences = await AccountService.updatePreferences(req.currentUser.id, req.body);

      res.status(200).json({
        message: 'Preferences updated successfully',
        preferences,
      });
    } catch (error) {
      logger.error(error, 'Error in updatePreferences');
      throw error;
    }
  }

  /**
   * GET /api/account/membership
   * Get membership information
   */
  static async getMembership(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser) {
        throw new Error('User not authenticated');
      }

      const membership = await AccountService.getMembership(req.currentUser.id);

      res.status(200).json({
        message: 'Membership information retrieved successfully',
        membership,
      });
    } catch (error) {
      logger.error(error, 'Error in getMembership');
      throw error;
    }
  }
}
