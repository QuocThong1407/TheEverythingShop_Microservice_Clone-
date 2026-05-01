# 📦 Order Service

Order management and processing service for The Everything Shop platform.

---

## 📋 Overview

The Order Service handles:
- ✅ Order creation and management
- ✅ Order status tracking (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- ✅ Return request processing
- ✅ Inventory synchronization
- ✅ Payment status tracking
- ✅ Event publishing (order lifecycle events)
- ✅ Event subscription (payment events)

---

## 🗂️ Project Structure

```
order-service/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Database migrations
├── src/
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── order/
│   │       ├── index.ts       # Module exports
│   │       ├── order.controller.ts    # HTTP handlers
│   │       ├── order.service.ts       # Business logic
│   │       ├── order.repository.ts    # Database operations
│   │       ├── order.routes.ts        # API routes
│   │       └── order.validation.ts    # Input validation
│   └── dist/                  # Compiled output
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── Dockerfile.dev             # Development Docker image
├── .env                       # Environment variables
└── README.md                  # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Link Shared Library

```bash
npm link @teleshop/common
# Or use:
npm install file:../../shared
```

### 3. Setup Environment

The `.env` file is already configured. For production, update:
- `JWT_SECRET` - Use a strong secret key (min 32 chars)
- `DATABASE_URL` - Your PostgreSQL connection string
- `RABBITMQ_URL` - Your RabbitMQ connection URL

### 4. Run Database Migrations

```bash
# Create initial migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy

# (Optional) Seed demo data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Service will be available at: `http://localhost:3005`

### 6. Verify

```bash
curl http://localhost:3005/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "order-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

### Order Endpoints (8 total)

#### 1. **POST** `/api/orders` (Authenticated)

Create new order.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "prod-001",
      "productName": "Pro Laptop",
      "productSku": "LAPTOP-001",
      "quantity": 1,
      "unitPrice": 1500,
      "discount": 0
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phoneNumber": "0123456789",
    "street": "123 Main Street",
    "district": "District 1",
    "city": "Ho Chi Minh",
    "country": "VN"
  },
  "shippingCost": 50,
  "tax": 142,
  "notes": "Please handle with care"
}
```

**Response:** (201 Created)

---

#### 2. **GET** `/api/orders` (Authenticated)

Get user's orders with pagination and filtering.

**Query Parameters:**
- `status`: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:** (200 OK)
```json
{
  "message": "Orders retrieved successfully",
  "orders": [...],
  "total": 10,
  "page": 1,
  "pages": 1
}
```

---

#### 3. **GET** `/api/orders/:orderId` (Authenticated)

Get order by ID.

---

#### 4. **PATCH** `/api/orders/:orderId/confirm` (Authenticated)

Confirm order (PENDING → CONFIRMED).

---

#### 5. **PATCH** `/api/orders/:orderId/ship` (Admin)

Ship order (CONFIRMED → SHIPPED).

---

#### 6. **PATCH** `/api/orders/:orderId/deliver` (Admin)

Deliver order (SHIPPED → DELIVERED).

---

#### 7. **PATCH** `/api/orders/:orderId/cancel` (Authenticated)

Cancel order.

---

#### 8. **GET** `/api/orders/:userId/stats` (Authenticated)

Get order statistics for user.

**Response:** (200 OK)
```json
{
  "message": "Order statistics retrieved successfully",
  "stats": {
    "totalOrders": 5,
    "totalSpent": 9585,
    "totalItems": 12
  }
}
```

---

### Return Endpoints (5 total)

#### 9. **POST** `/api/orders/:orderId/returns` (Authenticated)

Request return.

**Request Body:**
```json
{
  "items": ["prod-001", "prod-002"],
  "reason": "Product quality not as expected"
}
```

**Response:** (201 Created)

---

#### 10. **GET** `/api/orders/:orderId/returns` (Authenticated)

Get returns for order.

---

#### 11. **GET** `/api/orders/returns/:returnId` (Authenticated)

Get return by ID.

---

#### 12. **PATCH** `/api/orders/returns/:returnId/approve` (Admin)

Approve return.

**Request Body:**
```json
{
  "refundAmount": 1500,
  "notes": "Return approved and processed"
}
```

---

#### 13. **PATCH** `/api/orders/returns/:returnId/complete` (Admin)

Complete return (process refund).

---

## 🗄️ Database Schema

### Order Model
```
- id: String (PK)
- orderNumber: String (UNIQUE)
- userId: String (from Auth Service)
- status: PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED
- paymentStatus: PENDING | COMPLETED | FAILED | REFUNDED
- subtotal: Float (sum of items)
- shippingCost: Float
- tax: Float
- total: Float (subtotal + shipping + tax)
- shippingAddress: Json
- billingAddress: Json?
- notes: String?
- items: OrderItem[] (relation)
- returns: Return[] (relation)
- createdAt: DateTime
- updatedAt: DateTime
```

### OrderItem Model
```
- id: String (PK)
- orderId: String (FK)
- productId: String (from Catalog Service)
- productName: String
- productSku: String
- quantity: Int
- unitPrice: Float (price at order time)
- discount: Float
- subtotal: Float ((unitPrice - discount) * quantity)
- order: Order (relation)
- createdAt: DateTime
- updatedAt: DateTime
```

### Return Model
```
- id: String (PK)
- orderId: String (FK)
- returnNumber: String (UNIQUE)
- items: String[] (productIds to return)
- reason: String
- status: PENDING | APPROVED | COMPLETED | REJECTED
- refundAmount: Float
- notes: String?
- order: Order (relation)
- createdAt: DateTime
- updatedAt: DateTime
```

---

## 📡 Events

### Published Events

#### 1. ORDER_CREATED
Published when order is created.

```json
{
  "type": "ORDER_CREATED",
  "aggregateId": "order-id",
  "data": {
    "orderId": "clv...",
    "orderNumber": "ORD-...",
    "userId": "user-id",
    "items": [...],
    "total": 1917
  }
}
```

#### 2. ORDER_CONFIRMED
Published when order is confirmed.

#### 3. ORDER_SHIPPED
Published when order is shipped.

#### 4. ORDER_DELIVERED
Published when order is delivered.

#### 5. ORDER_CANCELLED
Published when order is cancelled (triggers inventory restoration).

#### 6. RETURN_REQUESTED
Published when return is requested.

#### 7. RETURN_APPROVED
Published when return is approved.

#### 8. RETURN_COMPLETED
Published when return is completed.

### Subscribed Events

#### PAYMENT_SUCCESS (from Payment Service)
Update order payment status to COMPLETED.

#### PAYMENT_FAILED (from Payment Service)
Update order payment status to FAILED.

---

## 📊 Order Status Workflow

```
PENDING
  ↓ (Confirm)
CONFIRMED
  ↓ (Ship)
SHIPPED
  ↓ (Deliver)
DELIVERED
  ↓ (Request Return)
RETURN REQUESTED

CANCELLED (from any status except DELIVERED)
```

---

## 🔐 Security & Features

### Authentication
- ✅ JWT token verification (required for all operations)
- ✅ User context extraction
- ✅ Ownership verification (users can only see own orders)
- ✅ Role-based access (admin-only ship/deliver/approve)

### Validation
- ✅ Input validation for all endpoints
- ✅ express-validator for comprehensive checks
- ✅ Order number uniqueness
- ✅ Return number uniqueness
- ✅ Item quantity validation

### Data Integrity
- ✅ Cascade delete (items/returns deleted when order deleted)
- ✅ Order total calculation
- ✅ Item subtotal calculation
- ✅ Foreign key relationships
- ✅ Order status transitions validation

### Event System
- ✅ Publish 8 order lifecycle events
- ✅ Subscribe to payment events
- ✅ Inventory synchronization via events
- ✅ Event error handling with requeue

### Error Handling
- ✅ Proper HTTP status codes
- ✅ User-friendly error messages
- ✅ Validation error details
- ✅ Authorization errors

---

## 💻 Architecture

```
┌──────────────────────┐
│   HTTP Request       │
│ (Bearer token)       │
└────────────┬─────────┘
             ↓
    ┌─────────────────┐
    │   Routes        │
    │ (auth required) │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  Validation     │
    │ (express-val)   │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  Controller     │
    │ (HTTP handlers) │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │   Service       │
    │ (business logic)│
    │ (RabbitMQ pub)  │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Repository      │
    │ (Prisma ORM)    │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  PostgreSQL     │
    │ (order_db)      │
    └─────────────────┘
```

---

## 🔄 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.3.3 |
| Runtime | Node.js | 18 LTS |
| Framework | Express.js | 5.x |
| ORM | Prisma | 5.7.1 |
| Database | PostgreSQL | 15 |
| Message Broker | RabbitMQ | 3.12 |
| Validation | express-validator | 7.0.0 |
| Logging | pino | 8.16.2 |

---

## 🎯 Demo Data

After running `npm run db:seed`:

| Entity | Count | Details |
|--------|-------|---------|
| Orders | 3 | CONFIRMED, DELIVERED, PENDING |
| Order Items | 5 | Mix of products |
| Returns | 1 | APPROVED return |

---

## 🧪 Testing Examples

### Create Order
```bash
curl -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "items": [
      {
        "productId": "prod-001",
        "productName": "Pro Laptop",
        "productSku": "LAPTOP-001",
        "quantity": 1,
        "unitPrice": 1500,
        "discount": 0
      }
    ],
    "shippingAddress": {
      "fullName": "John Doe",
      "phoneNumber": "0123456789",
      "street": "123 Main Street",
      "district": "District 1",
      "city": "Ho Chi Minh"
    },
    "shippingCost": 50,
    "tax": 142
  }'
```

### Get User Orders
```bash
curl -X GET "http://localhost:3005/api/orders?status=CONFIRMED&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

### Confirm Order
```bash
curl -X PATCH http://localhost:3005/api/orders/{orderId}/confirm \
  -H "Authorization: Bearer {token}"
```

### Request Return
```bash
curl -X POST http://localhost:3005/api/orders/{orderId}/returns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "items": ["prod-001"],
    "reason": "Product not as described"
  }'
```

---

## 📝 Available Commands

```bash
npm run start          # Production start
npm run dev            # Development (hot reload)
npm run build          # Compile TypeScript
npm run lint           # Run ESLint
npm run test           # Run Jest tests
npm run test:watch     # Watch mode tests
npm run db:migrate     # Create migration
npm run db:push        # Push schema
npm run db:reset       # Reset database
npm run db:seed        # Seed demo data
```

---

## 🔗 Integration with Other Services

**Order Service integrates with:**
- **Auth Service** - User authentication
- **Catalog Service** - Product information & inventory management
- **Payment Service** - Payment processing
- **Account Service** - User profile updates (membership stats)
- **API Gateway (Traefik)** - Routes /api/orders/* requests

---

## ✅ Implementation Checklist

- [x] Prisma schema (3 models: Order, OrderItem, Return)
- [x] Database migrations
- [x] Validation layer
- [x] Repository layer (18 methods)
- [x] Service layer (13 methods)
- [x] Controller layer (13 endpoints)
- [x] Routes configuration
- [x] Error handling
- [x] Event publishing (8 events)
- [x] Event subscription (2 events)
- [x] Request validation
- [x] Authentication middleware
- [x] Authorization checks
- [x] Order total calculation
- [x] Item subtotal calculation
- [x] Return processing
- [x] Environment configuration
- [x] Database seeding
- [x] Graceful shutdown
- [x] Health check endpoint
- [x] Express app setup
- [x] Logging configuration
- [x] Error middleware

---

## 📞 Support

- **Health**: GET http://localhost:3005/health
- **Logs**: `npm run dev` (console)
- **Database**: `psql -h localhost -p 5436 -U order_user -d order_db`
- **RabbitMQ**: http://localhost:15672 (guest:guest)

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
