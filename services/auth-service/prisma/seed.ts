import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('Demo@123456', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@teleshop.com' },
    update: {},
    create: {
      email: 'admin@teleshop.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.id);

  // Create seller user
  const seller = await prisma.user.upsert({
    where: { email: 'seller@teleshop.com' },
    update: {},
    create: {
      email: 'seller@teleshop.com',
      password: hashedPassword,
      firstName: 'Seller',
      lastName: 'User',
      role: UserRole.SELLER,
    },
  });
  console.log('✅ Seller user created:', seller.id);

  // Create customer user
  const customer = await prisma.user.upsert({
    where: { email: 'customer@teleshop.com' },
    update: {},
    create: {
      email: 'customer@teleshop.com',
      password: hashedPassword,
      firstName: 'Customer',
      lastName: 'User',
      role: UserRole.CUSTOMER,
    },
  });
  console.log('✅ Customer user created:', customer.id);

  console.log('✅ Database seeded successfully!');
  console.log(`
    Demo Users Created:
    - Admin: admin@teleshop.com (Password: Demo@123456)
    - Seller: seller@teleshop.com (Password: Demo@123456)
    - Customer: customer@teleshop.com (Password: Demo@123456)
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
