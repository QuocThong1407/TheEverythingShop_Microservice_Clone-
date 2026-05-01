# 💳 Payment Service

Payment processing microservice with support for multiple payment gateways (VNPAY, Stripe, Momo).

---

## 📋 Overview

The Payment Service handles:
- ✅ Payment creation and processing
- ✅ Multiple payment methods (VNPAY, Stripe, Momo, Card, Bank Transfer)
- ✅ Payment status tracking
- ✅ Refund management
- ✅ Gateway webhook callbacks
- ✅ Event publishing (PAYMENT_SUCCESS, PAYMENT_FAILED, REFUND_COMPLETED)
- ✅ PostgreSQL persistence with Prisma ORM

---

## 🗂️ Project Structure

```
payment-service/
├── src/
│   ├── config/
│   │   └── database.ts        # Prisma client setup
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── payment/
│   │       ├── index.ts       # Module exports
│   │       ├── payment.controller.ts    # HTTP handlers
│   │       ├── payment.service.ts       # Business logic
│   │       ├── payment.repository.ts    # Database access
│   │       ├── payment.gateway.ts       # Gateway integrations
│   │       ├── payment.routes.ts        # API routes
│   │       └── payment.validation.ts    # Input validation
│   └── dist/                  # Compiled output
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data
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
npm install file:../../shared
```

### 3. Setup PostgreSQL

Create database:
```sql
CREATE DATABASE payment_db;
CREATE USER payment_user WITH PASSWORD 'payment_pass';
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;
```

Or using Docker:
```bash
docker run -d \
  --name payment-postgres \
  -e POSTGRES_USER=payment_user \
  -e POSTGRES_PASSWORD=payment_pass \
  -e POSTGRES_DB=payment_db \
  -p 5437:5432 \
  postgres:15
```

### 4. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed Demo Data

```bash
npm run prisma:seed
```

### 6. Setup Environment

Update `.env` with your payment gateway credentials:
```
VNPAY_TMN_CODE=your-tmn-code
VNPAY_HASH_SECRET=your-hash-secret
STRIPE_API_KEY=your-stripe-key
MOMO_PARTNER_CODE=your-partner-code
```

### 7. Start Development Server

```bash
npm run dev
```

Service will be available at: `http://localhost:3006`

### 8. Verify

```bash
curl http://localhost:3006/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "payment-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📊 Database Schema

### Payment Model

```typescript
model Payment {
  id                String        @id @default(uuid())
  orderId           String        @unique    // Link to order
  userId            String                   // Link to user
  amount            Decimal       // Payment amount
  currency          String        // VND, USD, etc.
  status            PaymentStatus @default(PENDING)
  paymentMethod     String        // VNPAY, STRIPE, MOMO, CARD, BANK_TRANSFER
  transactionId     String?       // Gateway transaction ID
  gatewayResponse   Json?         // Gateway response data
  metadata          Json?         // Additional data
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  expiresAt         DateTime?
  refunds           Refund[]
}

enum PaymentStatus {
  PENDING, AUTHORIZED, CAPTURED, COMPLETED, FAILED, CANCELLED, EXPIRED
}
```

### Refund Model

```typescript
model Refund {
  id                    String        @id @default(uuid())
  paymentId             String        // Link to payment
  orderId               String
  userId                String
  amount                Decimal       // Refund amount
  reason                String        // Refund reason
  status                RefundStatus  @default(PENDING)
  refundTransactionId   String?       // Gateway refund transaction ID
  gatewayResponse       Json?
  metadata              Json?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

enum RefundStatus {
  PENDING, INITIATED, PROCESSING, COMPLETED, FAILED, REJECTED
}
```

---

## 📡 API Endpoints

### Payment Management (7 endpoints)

#### 1. **POST** `/api/payments` - Create Payment

**Request:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "amount": 1500.00,
  "currency": "VND",
  "paymentMethod": "VNPAY",
  "metadata": { "description": "Order items" }
}
```

**Response:** (201 Created)
```json
{
  "message": "Payment created successfully",
  "payment": {
    "id": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": "1500.00",
    "currency": "VND",
    "status": "PENDING",
    "paymentMethod": "VNPAY",
    "createdAt": "2026-04-29T10:30:00Z"
  },
  "paymentUrl": "https://sandbox.vnpayment.vn/paygate/pay.html?..."
}
```

**Payment Methods:**
- VNPAY (Vietnam)
- STRIPE (International)
- MOMO (Vietnam)
- CARD
- BANK_TRANSFER

---

#### 2. **GET** `/api/payments/:paymentId` - Get Payment

**Response:** (200 OK)
```json
{
  "message": "Payment retrieved successfully",
  "payment": {
    "id": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": "1500.00",
    "currency": "VND",
    "status": "COMPLETED",
    "paymentMethod": "VNPAY",
    "transactionId": "VNPAY_TXN_001",
    "createdAt": "2026-04-29T10:30:00Z",
    "updatedAt": "2026-04-29T10:35:00Z"
  }
}
```

---

#### 3. **GET** `/api/payments/order/:orderId` - Get Payment by Order

---

#### 4. **GET** `/api/payments` - List Payments

**Query Parameters:**
- `userId` (optional) - Filter by user
- `orderId` (optional) - Filter by order
- `status` (optional) - Filter by status (PENDING, COMPLETED, FAILED, etc.)
- `skip` (optional, default=0) - Pagination offset
- `take` (optional, default=10) - Page size

**Response:** (200 OK)
```json
{
  "message": "Payments retrieved successfully",
  "payments": [
    { "id": "pay-1", "orderId": "ord-1", "status": "COMPLETED", "amount": "1500.00" },
    { "id": "pay-2", "orderId": "ord-2", "status": "PENDING", "amount": "2500.00" }
  ],
  "total": 2,
  "skip": 0,
  "take": 10
}
```

---

#### 5. **POST** `/api/payments/:paymentId/confirm` - Confirm Payment

**Request:**
```json
{
  "transactionId": "VNPAY_TXN_001",
  "gatewayResponse": { "responseCode": "00", "message": "Approved" }
}
```

---

#### 6. **POST** `/api/payments/:paymentId/cancel` - Cancel Payment

---

#### 7. **POST** `/api/payments/webhook/vnpay` - VNPAY Webhook

**Request (from VNPAY):**
```json
{
  "orderId": "order-uuid",
  "transactionId": "VNPAY_TXN_001",
  "status": "SUCCESS",
  "gatewayResponse": { "vnp_ResponseCode": "00" }
}
```

---

### Refund Management (5 endpoints)

#### 8. **POST** `/api/payments/:paymentId/refund` - Initiate Refund (Admin)

**Request:**
```json
{
  "amount": 500.00,
  "reason": "Customer requested refund due to damaged product",
  "metadata": { "requestId": "REQ-001" }
}
```

**Response:** (201 Created)
```json
{
  "message": "Refund initiated successfully",
  "refund": {
    "id": "refund-uuid",
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "amount": "500.00",
    "reason": "Customer requested refund...",
    "status": "PENDING",
    "createdAt": "2026-04-29T10:40:00Z"
  }
}
```

---

#### 9. **GET** `/api/payments/refund/:refundId` - Get Refund

---

#### 10. **GET** `/api/payments/refunds` - List Refunds

---

#### 11. **POST** `/api/payments/refund/:refundId/confirm` - Confirm Refund (Admin)

**Request:**
```json
{
  "refundTransactionId": "REFUND_TXN_001",
  "status": "COMPLETED",
  "gatewayResponse": { "refundCode": "00" }
}
```

---

#### 12. **GET** `/api/payments/:paymentId/refunds` - Get Refunds for Payment

**Response:** (200 OK)
```json
{
  "message": "Refunds retrieved successfully",
  "refunds": [
    {
      "id": "refund-1",
      "paymentId": "pay-1",
      "amount": "500.00",
      "status": "COMPLETED",
      "reason": "..."
    }
  ],
  "total": 1
}
```

---

## 🔌 Payment Gateway Integrations

### VNPAY

**Configuration:**
```
VNPAY_TMN_CODE=your-terminal-code
VNPAY_HASH_SECRET=your-hash-secret
VNPAY_URL=https://sandbox.vnpayment.vn/paygate/pay.html
VNPAY_RETURN_URL=http://localhost:3006/api/payments/webhook/vnpay
```

**Payment Flow:**
1. Create payment → Get VNPAY payment URL
2. User redirected to VNPAY checkout
3. VNPAY sends callback webhook
4. Payment verified and updated

---

### Stripe

**Configuration:**
```
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Payment Flow:**
1. Create payment → Get Stripe checkout session
2. User completes Stripe checkout
3. Stripe sends webhook callback
4. Payment verified and updated

---

### Momo

**Configuration:**
```
MOMO_PARTNER_CODE=your-partner-code
MOMO_ACCESS_KEY=your-access-key
MOMO_SECRET_KEY=your-secret-key
MOMO_URL=https://test-payment.momo.vn/v3/gateway/api/create
```

**Payment Flow:**
1. Create payment → Get Momo payment link
2. User scans QR or clicks link
3. Completes payment in Momo app
4. Momo sends callback webhook
5. Payment verified and updated

---

## 📡 Events

### Published Events

#### PAYMENT_INITIATED
Fired when payment is created.
```json
{
  "type": "PAYMENT_INITIATED",
  "data": {
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": 1500,
    "paymentMethod": "VNPAY"
  }
}
```

#### PAYMENT_SUCCESS
Fired when payment is successfully verified.
```json
{
  "type": "PAYMENT_SUCCESS",
  "data": {
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": 1500,
    "transactionId": "VNPAY_TXN_001"
  }
}
```

#### PAYMENT_FAILED
Fired when payment fails verification.
```json
{
  "type": "PAYMENT_FAILED",
  "data": {
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": 1500,
    "reason": "Invalid response from gateway"
  }
}
```

#### REFUND_INITIATED
Fired when refund is initiated.
```json
{
  "type": "REFUND_INITIATED",
  "data": {
    "refundId": "refund-uuid",
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "amount": 500,
    "reason": "Customer requested refund"
  }
}
```

#### REFUND_COMPLETED
Fired when refund is successfully processed.
```json
{
  "type": "REFUND_COMPLETED",
  "data": {
    "refundId": "refund-uuid",
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": 500
  }
}
```

---

## 💻 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.3.3 |
| Runtime | Node.js | 18 LTS |
| Framework | Express.js | 5.x |
| ORM | Prisma | 5.7.1 |
| Database | PostgreSQL | 15 |
| Validation | express-validator | 7.0.0 |
| Logging | pino | 8.16.2 |
| Message Broker | RabbitMQ | 3.12 |

---

## 🔐 Security & Features

### Authentication
- ✅ JWT token verification (required for all operations except webhooks)
- ✅ User context extraction
- ✅ Admin-only refund operations

### Authorization
- ✅ Users see only their own payments
- ✅ Only admins can initiate refunds

### Validation
- ✅ Input validation for all operations
- ✅ Amount validation (must be positive)
- ✅ Currency validation (3-letter codes)
- ✅ Payment method validation

### Gateway Integration
- ✅ HMAC signature verification (production)
- ✅ Webhook signature validation
- ✅ Transaction ID tracking
- ✅ Response encryption support

### Error Handling
- ✅ Proper HTTP status codes
- ✅ User-friendly error messages
- ✅ Validation error details
- ✅ Gateway error handling

---

## 📝 Available Commands

```bash
npm run start          # Production start
npm run dev            # Development (hot reload)
npm run build          # Compile TypeScript
npm run lint           # Run ESLint
npm run test           # Run Jest tests
npm run test:watch     # Watch mode tests
npm run prisma:migrate # Run database migrations
npm run prisma:seed    # Seed demo data
npm run prisma:studio  # Open Prisma Studio
```

---

## 🗄️ Demo Data

After seeding with `npm run prisma:seed`:

**3 Demo Payments:**
1. Payment 1: $1,500 - VNPAY - COMPLETED
2. Payment 2: $2,500 - STRIPE - PENDING
3. Payment 3: $800 - MOMO - COMPLETED

**1 Demo Refund:**
- Refund for Payment 1: $500 - COMPLETED

---

## 🧪 Testing Examples

### Create Payment
```bash
curl -X POST http://localhost:3006/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 1500,
    "currency": "VND",
    "paymentMethod": "VNPAY"
  }'
```

### Get Payment
```bash
curl http://localhost:3006/api/payments/pay-uuid \
  -H "Authorization: Bearer {token}"
```

### Initiate Refund
```bash
curl -X POST http://localhost:3006/api/payments/pay-uuid/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{
    "amount": 500,
    "reason": "Customer requested refund"
  }'
```

---

## 🔗 Integration with Other Services

**Payment Service integrates with:**
- **Auth Service** - User authentication via JWT
- **Order Service** - Triggered by ORDER_CREATED event
- **Account Service** - User information
- **Notification Service** - Payment confirmation emails
- **Payment Gateways** - VNPAY, Stripe, Momo APIs

---

## 📊 Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend/Cart Service                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
        POST /api/payments (create payment)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Payment Service                                             │
│ ├─ Create Payment record (status=PENDING)                 │
│ ├─ Get Payment Gateway                                    │
│ ├─ Initiate with Gateway (get payment URL)               │
│ └─ Publish PAYMENT_INITIATED event                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
        paymentUrl returned to client
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ User Browser                                                │
│ ├─ Navigate to Payment Gateway URL                         │
│ └─ Enter payment credentials                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
        User completes payment in gateway
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Payment Gateway (VNPAY/Stripe/Momo)                        │
│ ├─ Process payment                                         │
│ └─ Send webhook callback to Payment Service               │
└──────────────────┬──────────────────────────────────────────┘
                   │
        POST /api/payments/webhook/vnpay
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Payment Service                                             │
│ ├─ Verify webhook signature                               │
│ ├─ Verify payment with gateway                            │
│ ├─ Update Payment status (COMPLETED/FAILED)               │
│ └─ Publish PAYMENT_SUCCESS/FAILED event                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
        Event consumed by Order/Notification Services
                   ▼
              [Order Processing / Email sent]
```

---

## ✅ Implementation Checklist

- [x] Prisma schema (Payment & Refund models)
- [x] Database configuration
- [x] Repository layer
- [x] Service layer (9 methods)
- [x] Controller layer (12 endpoints)
- [x] Validation layer
- [x] Routes configuration
- [x] Payment gateways (VNPAY, Stripe, Momo)
- [x] Webhook handling
- [x] Event publishing
- [x] Error handling
- [x] Database migrations
- [x] Demo seed data
- [x] TypeScript strict mode
- [x] Docker configuration
- [x] Environment setup

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
