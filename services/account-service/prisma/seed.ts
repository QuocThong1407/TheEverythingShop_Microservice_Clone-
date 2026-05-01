import { PrismaClient, MembershipTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Account Service database...');

  // Create user profiles with sample data
  const profiles = await Promise.all([
    prisma.userProfile.upsert({
      where: { userId: 'demo-admin-id' },
      update: {},
      create: {
        userId: 'demo-admin-id',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+84912345678',
        bio: 'Administrator account',
        membershipTier: MembershipTier.PLATINUM,
        totalSpent: 10000000,
        totalOrders: 50,
        totalReviews: 25,
      },
    }),
    prisma.userProfile.upsert({
      where: { userId: 'demo-seller-id' },
      update: {},
      create: {
        userId: 'demo-seller-id',
        firstName: 'Seller',
        lastName: 'User',
        phone: '+84912345679',
        bio: 'Seller account',
        membershipTier: MembershipTier.GOLD,
        totalSpent: 5000000,
        totalOrders: 30,
        totalReviews: 15,
      },
    }),
    prisma.userProfile.upsert({
      where: { userId: 'demo-customer-id' },
      update: {},
      create: {
        userId: 'demo-customer-id',
        firstName: 'Customer',
        lastName: 'User',
        phone: '+84912345680',
        bio: 'Customer account',
        membershipTier: MembershipTier.SILVER,
        totalSpent: 2000000,
        totalOrders: 10,
        totalReviews: 5,
      },
    }),
  ]);

  console.log('✅ Created user profiles');

  // Create sample addresses
  for (const profile of profiles) {
    // Home address
    await prisma.address.create({
      data: {
        profileId: profile.id,
        type: 'HOME',
        label: 'Home',
        fullName: `${profile.firstName} ${profile.lastName}`,
        phoneNumber: profile.phone || '0000000000',
        street: 'Đường Nguyễn Huệ',
        streetNumber: '100',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        city: 'Hồ Chí Minh',
        zipCode: '70000',
        country: 'VN',
        isDefault: true,
      },
    });

    // Work address
    await prisma.address.create({
      data: {
        profileId: profile.id,
        type: 'WORK',
        label: 'Office',
        fullName: `${profile.firstName} ${profile.lastName}`,
        phoneNumber: profile.phone || '0000000000',
        street: 'Đường Lê Lợi',
        streetNumber: '50',
        district: 'Quận 1',
        ward: 'Phường Bến Thành',
        city: 'Hồ Chí Minh',
        zipCode: '70001',
        country: 'VN',
        isDefault: false,
      },
    });
  }

  console.log('✅ Created addresses');

  // Preferences are created automatically with user profiles in the schema
  console.log('✅ Database seeded successfully!');
  console.log(`
    Sample Profiles Created:
    - Admin User (admin@teleshop.com): PLATINUM tier
    - Seller User (seller@teleshop.com): GOLD tier
    - Customer User (customer@teleshop.com): SILVER tier
    
    Each profile has 2 sample addresses (HOME and WORK).
  `);
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
