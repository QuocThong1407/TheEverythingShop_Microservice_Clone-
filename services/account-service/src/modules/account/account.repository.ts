import { PrismaClient, UserProfile, Address, Preference, MembershipTier } from '@prisma/client';
import pino from 'pino';

const logger = pino();
const prisma = new PrismaClient();

export class AccountRepository {
  /**
   * Create user profile
   */
  static async createProfile(userId: string, data: {
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<UserProfile> {
    try {
      const profile = await prisma.userProfile.create({
        data: {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
        include: { preferences: true },
      });

      // Create default preference
      await prisma.preference.create({
        data: {
          profileId: profile.id,
        },
      });

      logger.info({ userId }, 'User profile created');
      return profile;
    } catch (error) {
      logger.error(error, 'Error creating user profile');
      throw error;
    }
  }

  /**
   * Find profile by user ID
   */
  static async findByUserId(userId: string): Promise<UserProfile | null> {
    try {
      return await prisma.userProfile.findUnique({
        where: { userId },
        include: {
          addresses: true,
          preferences: true,
        },
      });
    } catch (error) {
      logger.error(error, 'Error finding profile by user ID');
      throw error;
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string;
    bio: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  }>): Promise<UserProfile> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const updateData: any = {};

      // Direct profile fields
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.bio !== undefined) updateData.bio = data.bio;

      // Update profile
      if (Object.keys(updateData).length > 0) {
        await prisma.userProfile.update({
          where: { userId },
          data: updateData,
        });
      }

      // Update preferences if notification settings provided
      if (
        data.emailNotifications !== undefined ||
        data.smsNotifications !== undefined ||
        data.marketingEmails !== undefined
      ) {
        const prefData: any = {};
        if (data.emailNotifications !== undefined) prefData.emailNotifications = data.emailNotifications;
        if (data.smsNotifications !== undefined) prefData.smsNotifications = data.smsNotifications;
        if (data.marketingEmails !== undefined) prefData.marketingEmails = data.marketingEmails;

        await prisma.preference.update({
          where: { profileId: profile.id },
          data: prefData,
        });
      }

      logger.info({ userId }, 'Profile updated');

      return await this.findByUserId(userId) as UserProfile;
    } catch (error) {
      logger.error(error, 'Error updating profile');
      throw error;
    }
  }

  /**
   * Add address
   */
  static async addAddress(userId: string, data: {
    type: string;
    label?: string;
    fullName: string;
    phoneNumber: string;
    street: string;
    streetNumber: string;
    district: string;
    ward: string;
    city: string;
    zipCode: string;
    country?: string;
    isDefault?: boolean;
  }): Promise<Address> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const address = await prisma.address.create({
        data: {
          profileId: profile.id,
          type: data.type as any,
          label: data.label,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          street: data.street,
          streetNumber: data.streetNumber,
          district: data.district,
          ward: data.ward,
          city: data.city,
          zipCode: data.zipCode,
          country: data.country || 'VN',
          isDefault: data.isDefault || false,
        },
      });

      logger.info({ userId, addressId: address.id }, 'Address added');
      return address;
    } catch (error) {
      logger.error(error, 'Error adding address');
      throw error;
    }
  }

  /**
   * Update address
   */
  static async updateAddress(addressId: string, data: Partial<{
    type: string;
    label: string;
    fullName: string;
    phoneNumber: string;
    street: string;
    streetNumber: string;
    district: string;
    ward: string;
    city: string;
    zipCode: string;
    isDefault: boolean;
  }>): Promise<Address> {
    try {
      const updateData: any = {};
      if (data.type) updateData.type = data.type;
      if (data.label !== undefined) updateData.label = data.label;
      if (data.fullName) updateData.fullName = data.fullName;
      if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
      if (data.street) updateData.street = data.street;
      if (data.streetNumber) updateData.streetNumber = data.streetNumber;
      if (data.district) updateData.district = data.district;
      if (data.ward) updateData.ward = data.ward;
      if (data.city) updateData.city = data.city;
      if (data.zipCode) updateData.zipCode = data.zipCode;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const address = await prisma.address.update({
        where: { id: addressId },
        data: updateData,
      });

      logger.info({ addressId }, 'Address updated');
      return address;
    } catch (error) {
      logger.error(error, 'Error updating address');
      throw error;
    }
  }

  /**
   * Delete address
   */
  static async deleteAddress(addressId: string): Promise<void> {
    try {
      await prisma.address.delete({
        where: { id: addressId },
      });

      logger.info({ addressId }, 'Address deleted');
    } catch (error) {
      logger.error(error, 'Error deleting address');
      throw error;
    }
  }

  /**
   * Get addresses for user
   */
  static async getAddresses(userId: string): Promise<Address[]> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return [];
      }

      return await prisma.address.findMany({
        where: { profileId: profile.id },
        orderBy: { isDefault: 'desc' },
      });
    } catch (error) {
      logger.error(error, 'Error getting addresses');
      throw error;
    }
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Unset all default addresses
      await prisma.address.updateMany({
        where: { profileId: profile.id },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      logger.info({ userId, addressId }, 'Default address updated');
    } catch (error) {
      logger.error(error, 'Error setting default address');
      throw error;
    }
  }

  /**
   * Update membership tier
   */
  static async updateMembershipTier(userId: string, tier: MembershipTier): Promise<UserProfile> {
    try {
      const profile = await prisma.userProfile.update({
        where: { userId },
        data: { membershipTier: tier },
      });

      logger.info({ userId, tier }, 'Membership tier updated');
      return profile;
    } catch (error) {
      logger.error(error, 'Error updating membership tier');
      throw error;
    }
  }

  /**
   * Update membership statistics
   */
  static async updateMembershipStats(userId: string, data: {
    totalSpent?: number;
    totalOrders?: number;
    totalReviews?: number;
  }): Promise<UserProfile> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const updateData: any = {};
      if (data.totalSpent !== undefined) {
        updateData.totalSpent = {
          increment: data.totalSpent,
        };
      }
      if (data.totalOrders !== undefined) {
        updateData.totalOrders = {
          increment: data.totalOrders,
        };
      }
      if (data.totalReviews !== undefined) {
        updateData.totalReviews = {
          increment: data.totalReviews,
        };
      }

      const updated = await prisma.userProfile.update({
        where: { userId },
        data: updateData,
      });

      logger.info({ userId }, 'Membership stats updated');
      return updated;
    } catch (error) {
      logger.error(error, 'Error updating membership stats');
      throw error;
    }
  }

  /**
   * Get preferences
   */
  static async getPreferences(userId: string): Promise<Preference | null> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return null;
      }

      return await prisma.preference.findUnique({
        where: { profileId: profile.id },
      });
    } catch (error) {
      logger.error(error, 'Error getting preferences');
      throw error;
    }
  }

  /**
   * Update preferences
   */
  static async updatePreferences(userId: string, data: {
    currency?: string;
    timezone?: string;
    language?: string;
    theme?: string;
  }): Promise<Preference> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const updateData: any = {};
      if (data.currency) updateData.currency = data.currency;
      if (data.timezone) updateData.timezone = data.timezone;
      if (data.language) updateData.language = data.language;
      if (data.theme) updateData.theme = data.theme;

      const preferences = await prisma.preference.update({
        where: { profileId: profile.id },
        data: updateData,
      });

      logger.info({ userId }, 'Preferences updated');
      return preferences;
    } catch (error) {
      logger.error(error, 'Error updating preferences');
      throw error;
    }
  }
}
