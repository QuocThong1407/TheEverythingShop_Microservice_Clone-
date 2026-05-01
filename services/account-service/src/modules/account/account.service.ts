import pino from 'pino';
import { MembershipTier } from '@prisma/client';
import { NotFoundError, BadRequestError, UnauthorizedError } from '@teleshop/common/errors';
import { getRabbitMQService, EventMessage } from '@teleshop/common/rabbitmq';
import { AccountEvents } from '@teleshop/common/events';
import { AccountRepository } from './account.repository';

const logger = pino();

export class AccountService {
  /**
   * Get user profile with all details
   */
  static async getProfile(userId: string) {
    try {
      const profile = await AccountRepository.findByUserId(userId);

      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      return profile;
    } catch (error) {
      logger.error(error, 'Error getting profile');
      throw error;
    }
  }

  /**
   * Create user profile (called by Auth Service on USER_REGISTERED event)
   */
  static async createProfile(userId: string, data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<any> {
    try {
      // Check if profile already exists
      const existing = await AccountRepository.findByUserId(userId);
      if (existing) {
        logger.warn({ userId }, 'Profile already exists, skipping creation');
        return existing;
      }

      const profile = await AccountRepository.createProfile(userId, {
        firstName: data.firstName,
        lastName: data.lastName,
      });

      // Publish PROFILE_CREATED event
      await this.publishAccountEvent(AccountEvents.PROFILE_UPDATED, {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        membershipTier: 'BRONZE',
      });

      logger.info({ userId }, 'Profile created successfully');
      return profile;
    } catch (error) {
      logger.error(error, 'Error creating profile');
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: any): Promise<any> {
    try {
      const profile = await AccountRepository.updateProfile(userId, data);

      // Publish PROFILE_UPDATED event
      await this.publishAccountEvent(AccountEvents.PROFILE_UPDATED, {
        userId,
        ...data,
      });

      logger.info({ userId }, 'Profile updated successfully');
      return profile;
    } catch (error) {
      logger.error(error, 'Error updating profile');
      throw error;
    }
  }

  /**
   * Add address to user profile
   */
  static async addAddress(userId: string, data: any): Promise<any> {
    try {
      const profile = await AccountRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      const address = await AccountRepository.addAddress(userId, data);

      // Publish ADDRESS_ADDED event
      await this.publishAccountEvent(AccountEvents.ADDRESS_ADDED, {
        userId,
        addressId: address.id,
        type: address.type,
        city: address.city,
      });

      logger.info({ userId }, 'Address added successfully');
      return address;
    } catch (error) {
      logger.error(error, 'Error adding address');
      throw error;
    }
  }

  /**
   * Update address
   */
  static async updateAddress(addressId: string, userId: string, data: any): Promise<any> {
    try {
      // Verify address belongs to user
      const profile = await AccountRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      const address = profile.addresses.find((a: any) => a.id === addressId);
      if (!address) {
        throw new NotFoundError('Address not found');
      }

      const updated = await AccountRepository.updateAddress(addressId, data);

      logger.info({ userId, addressId }, 'Address updated successfully');
      return updated;
    } catch (error) {
      logger.error(error, 'Error updating address');
      throw error;
    }
  }

  /**
   * Delete address
   */
  static async deleteAddress(addressId: string, userId: string): Promise<void> {
    try {
      // Verify address belongs to user
      const profile = await AccountRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      const address = profile.addresses.find((a: any) => a.id === addressId);
      if (!address) {
        throw new NotFoundError('Address not found');
      }

      await AccountRepository.deleteAddress(addressId);

      // Publish ADDRESS_REMOVED event
      await this.publishAccountEvent('ADDRESS_REMOVED', {
        userId,
        addressId,
      });

      logger.info({ userId, addressId }, 'Address deleted successfully');
    } catch (error) {
      logger.error(error, 'Error deleting address');
      throw error;
    }
  }

  /**
   * Get user addresses
   */
  static async getAddresses(userId: string): Promise<any> {
    try {
      const addresses = await AccountRepository.getAddresses(userId);
      return addresses;
    } catch (error) {
      logger.error(error, 'Error getting addresses');
      throw error;
    }
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    try {
      // Verify address belongs to user
      const profile = await AccountRepository.findByUserId(userId);
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      const address = profile.addresses.find((a: any) => a.id === addressId);
      if (!address) {
        throw new NotFoundError('Address not found');
      }

      await AccountRepository.setDefaultAddress(userId, addressId);

      logger.info({ userId, addressId }, 'Default address set');
    } catch (error) {
      logger.error(error, 'Error setting default address');
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string): Promise<any> {
    try {
      const preferences = await AccountRepository.getPreferences(userId);

      if (!preferences) {
        throw new NotFoundError('Preferences not found');
      }

      return preferences;
    } catch (error) {
      logger.error(error, 'Error getting preferences');
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, data: any): Promise<any> {
    try {
      const preferences = await AccountRepository.updatePreferences(userId, data);

      logger.info({ userId }, 'Preferences updated successfully');
      return preferences;
    } catch (error) {
      logger.error(error, 'Error updating preferences');
      throw error;
    }
  }

  /**
   * Get membership information
   */
  static async getMembership(userId: string): Promise<any> {
    try {
      const profile = await AccountRepository.findByUserId(userId);

      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      return {
        tier: profile.membershipTier,
        joinedAt: profile.joinedAt,
        totalSpent: profile.totalSpent,
        totalOrders: profile.totalOrders,
        totalReviews: profile.totalReviews,
      };
    } catch (error) {
      logger.error(error, 'Error getting membership');
      throw error;
    }
  }

  /**
   * Update membership tier (called by internal services based on spending)
   */
  static async updateMembershipTier(userId: string, tier: MembershipTier): Promise<any> {
    try {
      const profile = await AccountRepository.updateMembershipTier(userId, tier);

      // Publish MEMBERSHIP_TIER_CHANGED event
      await this.publishAccountEvent(AccountEvents.MEMBERSHIP_TIER_CHANGED, {
        userId,
        tier: tier,
        previousTier: profile.membershipTier,
      });

      logger.info({ userId, tier }, 'Membership tier updated');
      return profile;
    } catch (error) {
      logger.error(error, 'Error updating membership tier');
      throw error;
    }
  }

  /**
   * Update membership statistics (called by Order Service)
   */
  static async updateMembershipStats(userId: string, data: {
    totalSpent?: number;
    totalOrders?: number;
    totalReviews?: number;
  }): Promise<any> {
    try {
      const profile = await AccountRepository.updateMembershipStats(userId, data);

      logger.info({ userId }, 'Membership stats updated');
      return profile;
    } catch (error) {
      logger.error(error, 'Error updating membership stats');
      throw error;
    }
  }

  /**
   * Publish account event to RabbitMQ
   */
  private static async publishAccountEvent(eventType: string, data: any): Promise<void> {
    try {
      const rmq = getRabbitMQService();
      const eventMessage: EventMessage = {
        id: `${Date.now()}-${Math.random()}`,
        type: eventType,
        aggregateId: data.userId,
        aggregateType: 'UserProfile',
        data,
        timestamp: new Date(),
        version: 1,
        source: 'account-service',
      };

      await rmq.publish(eventType, eventMessage);
      logger.info({ eventType, userId: data.userId }, 'Account event published');
    } catch (error) {
      logger.error(error, 'Error publishing account event');
      // Don't throw - event publishing failure shouldn't break the main flow
    }
  }
}
