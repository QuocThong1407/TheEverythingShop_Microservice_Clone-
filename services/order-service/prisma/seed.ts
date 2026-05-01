import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing data
    await prisma.return.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    // Create demo orders
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-1714408200000-1234',
        userId: 'user-123', // Reference to Auth Service user
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        subtotal: 1725,
        shippingCost: 50,
        tax: 142,
        total: 1917,
        shippingAddress: {
          fullName: 'John Doe',
          phoneNumber: '0123456789',
          street: '123 Main Street',
          district: 'District 1',
          ward: 'Ward 1',
          city: 'Ho Chi Minh',
          country: 'VN',
        },
        items: {
          createMany: {
            data: [
              {
                productId: 'prod-001',
                productName: 'Pro Laptop',
                productSku: 'LAPTOP-001',
                quantity: 1,
                unitPrice: 1500,
                discount: 0,
                subtotal: 1500,
              },
              {
                productId: 'prod-002',
                productName: 'Cotton T-Shirt',
                productSku: 'TSHIRT-001',
                quantity: 3,
                unitPrice: 75,
                discount: 0,
                subtotal: 225,
              },
            ],
          },
        },
      },
      include: {
        items: true,
      },
    });

    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-1714408300000-5678',
        userId: 'user-456',
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        subtotal: 135,
        shippingCost: 30,
        tax: 13,
        total: 178,
        shippingAddress: {
          fullName: 'Jane Smith',
          phoneNumber: '0987654321',
          street: '456 Oak Avenue',
          district: 'District 2',
          ward: 'Ward 2',
          city: 'Hanoi',
          country: 'VN',
        },
        items: {
          createMany: {
            data: [
              {
                productId: 'prod-003',
                productName: 'LED Table Lamp',
                productSku: 'LAMP-001',
                quantity: 3,
                unitPrice: 45,
                discount: 0,
                subtotal: 135,
              },
            ],
          },
        },
      },
      include: {
        items: true,
      },
    });

    const order3 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-1714408400000-9012',
        userId: 'user-789',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: 1500,
        shippingCost: 50,
        tax: 124,
        total: 1674,
        shippingAddress: {
          fullName: 'Bob Johnson',
          phoneNumber: '0919191919',
          street: '789 Pine Road',
          district: 'District 3',
          ward: 'Ward 3',
          city: 'Da Nang',
          country: 'VN',
        },
        items: {
          createMany: {
            data: [
              {
                productId: 'prod-001',
                productName: 'Pro Laptop',
                productSku: 'LAPTOP-001',
                quantity: 1,
                unitPrice: 1500,
                discount: 0,
                subtotal: 1500,
              },
            ],
          },
        },
      },
      include: {
        items: true,
      },
    });

    // Create demo return
    const ret = await prisma.return.create({
      data: {
        orderId: order2.id,
        returnNumber: 'RET-1714408500000-1111',
        items: ['prod-003'],
        reason: 'Product quality not as expected, missing packaging',
        status: 'APPROVED',
        refundAmount: 135,
        notes: 'Approved for full refund',
      },
    });

    console.log('✅ Seeding completed successfully!');
    console.log(`
📊 Demo Data Created:
  - ${3} Orders
  - ${5} Order Items
  - ${1} Return Request
    
📋 Orders:
  1. Order #${order1.orderNumber} - Status: CONFIRMED, Total: $${order1.total}
  2. Order #${order2.orderNumber} - Status: DELIVERED, Total: $${order2.total}
  3. Order #${order3.orderNumber} - Status: PENDING, Total: $${order3.total}

🔄 Returns:
  1. Return #${ret.returnNumber} - Status: APPROVED, Amount: $${ret.refundAmount}
    `);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
