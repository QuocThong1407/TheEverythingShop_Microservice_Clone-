import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Catalog Service database...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing and fashion accessories',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'home' },
      update: {},
      create: {
        name: 'Home & Garden',
        slug: 'home',
        description: 'Home and garden products',
      },
    }),
  ]);

  console.log('✅ Created categories');

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'LAPTOP-001' },
      update: {},
      create: {
        name: 'Pro Laptop',
        description: 'High-performance laptop for professionals',
        sku: 'LAPTOP-001',
        price: 1500,
        costPrice: 1000,
        stock: 50,
        sellerId: 'demo-seller-id',
        categoryId: categories[0].id,
        status: 'ACTIVE',
        rating: 4.5,
        ratingCount: 10,
        reviewCount: 5,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SHIRT-001' },
      update: {},
      create: {
        name: 'Cotton T-Shirt',
        description: 'Comfortable and stylish cotton t-shirt',
        sku: 'SHIRT-001',
        price: 25,
        costPrice: 10,
        stock: 200,
        sellerId: 'demo-seller-id',
        categoryId: categories[1].id,
        status: 'ACTIVE',
        rating: 4.8,
        ratingCount: 25,
        reviewCount: 12,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'LAMP-001' },
      update: {},
      create: {
        name: 'LED Table Lamp',
        description: 'Energy-efficient LED table lamp',
        sku: 'LAMP-001',
        price: 45,
        costPrice: 20,
        stock: 100,
        sellerId: 'demo-seller-id',
        categoryId: categories[2].id,
        status: 'ACTIVE',
        rating: 4.6,
        ratingCount: 8,
        reviewCount: 4,
      },
    }),
  ]);

  console.log('✅ Created sample products');

  // Create sample promotions
  await Promise.all([
    prisma.promotion.create({
      data: {
        productId: products[0].id,
        name: 'Summer Sale',
        description: '20% off on all laptops',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        maxDiscount: 300,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        active: true,
      },
    }),
    prisma.promotion.create({
      data: {
        productId: products[1].id,
        name: 'Flash Deal',
        description: '$5 off on t-shirts',
        discountType: 'FIXED',
        discountValue: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        active: true,
      },
    }),
  ]);

  console.log('✅ Created sample promotions');

  console.log('✅ Database seeded successfully!');
  console.log(`
    Sample Data Created:
    - 3 categories: Electronics, Fashion, Home & Garden
    - 3 products: Pro Laptop, Cotton T-Shirt, LED Table Lamp
    - 2 active promotions
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
