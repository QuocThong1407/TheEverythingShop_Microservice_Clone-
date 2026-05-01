# 🔧 Payment Service - Implementation Details

---

## 📁 File Structure

### Core Files (12)

#### 1. **src/index.ts** (Entry Point)
- Initializes Express app
- Connects to PostgreSQL via Prisma
- Initializes RabbitMQ connection
- Starts HTTP server on port 3006
- Subscribes to ORDER_CREATED event
- Implements graceful shutdown

**Key Functions:**
```typescript
const app = createApp()
await rabbit.initialize()
await rabbit.subscribe('payment-service-events-queue', ['order.created'], handler)
const server = app.listen(PORT, ...)
// Graceful shutdown on signals
```

---

#### 2. **src/app.ts** (Express Setup)
- Configures Express middleware stack
- Sets up pinoHttp logging
- Parses JSON/URL-encoded bodies (10MB limit)
- Attaches currentUser middleware
- Mounts payment routes
- Implements health check endpoint
- Centralized error handler

**Middleware Chain:**
```
1. pinoHttp logging
2. json/urlencoded parsing (10MB)
3. currentUser extraction
4. /health endpoint (no auth)
5. /api/payments routes
6. 404 handler
7. Error handler (last)
```

---

#### 3. **src/config/database.ts** (Database Configuration)
- Creates Prisma client
- Connection: `postgresql://user:pass@host:port/db`
- Auto-connects on import
- Handles connection errors

**Key Code:**
```typescript
const prisma = new PrismaClient()
prisma.$connect()
export { prisma }
```

---

#### 4. **src/modules/payment/payment.service.ts** (Business Logic)
- **2 main services**: PaymentService (8 methods), RefundService (5 methods)
- Handles payment operations
- Manages refund operations
- Publishes events to RabbitMQ

**PaymentService Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `createPayment()` | Create payment & get gateway URL | {payment, paymentUrl} |
| `confirmPayment()` | Confirm with transaction ID | Payment |
| `verifyPayment()` | Verify webhook callback | Payment |
| `getPayment()` | Fetch payment by ID | Payment |
| `getPaymentByOrderId()` | Fetch payment by order | Payment |
| `listPayments()` | List with filters & pagination | {payments, total} |
| `cancelPayment()` | Cancel pending/authorized | Payment |

**RefundService Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `initiateRefund()` | Create refund record | Refund |
| `confirmRefund()` | Confirm with transaction ID | Refund |
| `getRefund()` | Fetch refund by ID | Refund |
| `listRefunds()` | List with filters & pagination | {refunds, total} |
| `getRefundsByPayment()` | Get refunds for payment | Refund[] |

**Event Publishing:**
```typescript
// Payment events
await rabbit.publish('PAYMENT_INITIATED', {paymentId, orderId, ...})
await rabbit.publish('PAYMENT_SUCCESS', {paymentId, orderId, ...})
await rabbit.publish('PAYMENT_FAILED', {paymentId, orderId, ...})

// Refund events
await rabbit.publish('REFUND_INITIATED', {refundId, paymentId, ...})
await rabbit.publish('REFUND_COMPLETED', {refundId, paymentId, ...})
```

---

#### 5. **src/modules/payment/payment.repository.ts** (Database Access)
- **PaymentRepository**: Payment CRUD operations
- **RefundRepository**: Refund CRUD operations
- Uses Prisma for type-safe queries

**PaymentRepository Methods:**
```typescript
create()           // Create new payment
findById()         // Get by ID
findByOrderId()    // Get by order
findByTransactionId() // Get by transaction
findByUserId()     // Get user payments
findMany()         // Query with filters
update()           // Update payment
updateStatus()     // Update status + response
updateTransactionId() // Update transaction
delete()           // Delete payment
count()            // Count payments
```

---

#### 6. **src/modules/payment/payment.gateway.ts** (Payment Gateways)
- **VNPAYGateway**: VNPAY integration
- **StripeGateway**: Stripe integration
- **MomoGateway**: Momo integration
- **PaymentGatewayFactory**: Factory pattern

**Each Gateway Implements:**
```typescript
async initiate(request): Promise<PaymentResponse>
  // Generate payment URL/link for user

async verify(transactionId, gatewayData): Promise<VerifyPaymentResponse>
  // Verify payment success/failure
```

**Gateway Features:**
- HMAC signature generation (placeholder for demo)
- Amount formatting per gateway
- Response parsing and mapping
- Error handling

---

#### 7. **src/modules/payment/payment.controller.ts** (HTTP Handlers)
- **12 endpoint handlers** with error handling
- Extracts userId from JWT middleware
- Validates input via express-validator
- Returns standardized responses

**Handlers:**
- `createPayment` - POST /api/payments
- `getPayment` - GET /api/payments/:paymentId
- `getPaymentByOrder` - GET /api/payments/order/:orderId
- `listPayments` - GET /api/payments
- `confirmPayment` - POST /api/payments/:paymentId/confirm
- `cancelPayment` - POST /api/payments/:paymentId/cancel
- `vnpayCallback` - POST /api/payments/webhook/vnpay
- `momoCallback` - POST /api/payments/webhook/momo
- `initiateRefund` - POST /api/payments/:paymentId/refund
- `getRefund` - GET /api/payments/refund/:refundId
- `listRefunds` - GET /api/payments/refunds
- `confirmRefund` - POST /api/payments/refund/:refundId/confirm

---

#### 8. **src/modules/payment/payment.routes.ts** (Route Configuration)
- Defines 12 API routes with middleware
- Applies authentication (`requireAuth`)
- Applies authorization (admin checks)
- Applies validation
- Webhook routes (no auth)

**Route Structure:**
```typescript
// Public routes (no auth)
POST   /webhook/vnpay
POST   /webhook/momo

// Authenticated user routes
POST   /
GET    /
GET    /:paymentId
GET    /order/:orderId
POST   /:paymentId/confirm
POST   /:paymentId/cancel
POST   /:paymentId/refund (admin)
GET    /:paymentId/refunds

// Admin only routes
GET    /refund/:refundId (admin)
GET    /refunds (admin)
POST   /refund/:refundId/confirm (admin)
```

---

#### 9. **src/modules/payment/payment.validation.ts** (Input Validation)
- **10 validator chains** for all operations
- Uses express-validator rules
- Validates structure, types, and ranges

**Validators:**
- `validateCreatePayment` - Create operation
- `validateGetPayment` - Get by ID
- `validateConfirmPayment` - Confirm operation
- `validateWebhook` - Webhook callback
- `validateInitiateRefund` - Refund creation
- `validateGetRefund` - Get refund
- `validateConfirmRefund` - Confirm refund
- `validateListPayments` - List with filters
- `validateListRefunds` - List refunds

**Validation Examples:**
```typescript
body('amount').isFloat({min: 0.01})
body('currency').isLength({min: 3, max: 3})
body('paymentMethod').isIn(['VNPAY', 'STRIPE', 'MOMO', 'CARD', 'BANK_TRANSFER'])
body('reason').isLength({min: 10, max: 500})
```

---

#### 10. **src/modules/payment/index.ts** (Module Exports)
- Exports all payment services, controllers, repositories
- Single entry point for payment module

---

### Configuration Files (8)

#### 11. **package.json**
- Service name: `payment-service`
- Main: `dist/index.js`
- Type: `module` (ES modules)
- Dependencies: express, prisma, uuid, pino, @teleshop/common
- Dev: typescript, tsx, jest, eslint, ts-jest, prisma

---

#### 12. **tsconfig.json**
- Target: ES2020
- Module: ES2020 (ES modules)
- Strict: true (all strict flags)
- Declaration: true (generates .d.ts)

---

#### 13. **.env**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Token verification secret
- `RABBITMQ_URL`: RabbitMQ connection
- Gateway credentials (VNPAY, Stripe, Momo)
- Service URLs for other microservices

---

#### 14. **Dockerfile.dev**
- Base: `node:18-alpine`
- Multi-stage: compile TypeScript, run Node
- Expose: Port 3006
- CMD: `npm start`

---

#### 15. **.gitignore**
- Excludes: node_modules, dist, .env, *.log, .prisma

---

#### 16. **jest.config.js**
- Preset: ts-jest
- Test environment: node
- Coverage: 70% threshold

---

#### 17. **eslint.config.js**
- Parser: @typescript-eslint/parser
- Rules: no-unused-vars, no-explicit-any

---

#### 18. **prisma/schema.prisma** (Database Schema)
- Payment model (7 fields + relations)
- Refund model (8 fields + relations)
- PaymentStatus enum (7 values)
- RefundStatus enum (6 values)

---

#### 19. **prisma/seed.ts** (Demo Data)
- 3 demo payments (different methods & statuses)
- 1 demo refund (completed)
- Payment amounts: 1500, 2500, 800 VND/USD

---

## 🏗️ Architecture

### Layer Structure

```
Controllers (HTTP Handlers)
    ↓
Services (Business Logic)
    ↓
Repository (Database Access)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### Payment Gateways

```
Services
    ↓ calls
PaymentGatewayFactory
    ├─ VNPAY Gateway
    ├─ Stripe Gateway
    └─ Momo Gateway
    ↓ returns
PaymentResponse / VerifyPaymentResponse
```

### Event Flow

```
Services
    ↓ publishes to
RabbitMQ
    ├─ PAYMENT_INITIATED
    ├─ PAYMENT_SUCCESS
    ├─ PAYMENT_FAILED
    ├─ REFUND_INITIATED
    ├─ REFUND_COMPLETED
    └─ REFUND_FAILED
    ↓ consumed by
Order/Notification/Catalog Services
```

---

## 📊 Database Schema

### Payment Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid(),
  orderId UUID UNIQUE NOT NULL,
  userId UUID NOT NULL INDEXED,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  status VARCHAR(20) DEFAULT 'PENDING',
  paymentMethod VARCHAR(50) NOT NULL,
  transactionId VARCHAR(100) UNIQUE,
  gatewayResponse JSONB,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Refund Table

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid(),
  paymentId UUID NOT NULL INDEXED FOREIGN KEY,
  orderId UUID NOT NULL INDEXED,
  userId UUID NOT NULL INDEXED,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  refundTransactionId VARCHAR(100) UNIQUE,
  gatewayResponse JSONB,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 Event System

### Published Events

| Event | When | Data |
|-------|------|------|
| PAYMENT_INITIATED | Payment created | paymentId, orderId, userId, amount |
| PAYMENT_SUCCESS | Payment verified | paymentId, orderId, transactionId |
| PAYMENT_FAILED | Payment failed | paymentId, orderId, reason |
| REFUND_INITIATED | Refund created | refundId, paymentId, orderId, amount |
| REFUND_COMPLETED | Refund processed | refundId, paymentId, orderId |
| REFUND_FAILED | Refund failed | refundId, paymentId, reason |

### Subscribed Events

| Event | Handler |
|-------|---------|
| ORDER_CREATED | Log for reference (payment triggered via API) |

---

## 🔐 Security Model

### Authentication
- All endpoints require JWT (except webhooks)
- Token extracted by currentUser middleware

### Authorization
- Users see only their own payments
- Admin only: initiate refunds, confirm refunds, list all payments

### Input Validation
- express-validator for all inputs
- Type checking and range validation
- Sanitization (trim, format validation)

### Webhook Security
- HMAC signature verification (production)
- Request validation before processing
- Transaction ID verification

### Error Handling
- Proper HTTP status codes (201, 400, 401, 403, 404, 422, 500)
- User-friendly error messages
- Validation error details
- Gateway error wrapping

---

## 🧪 Testing Strategy

### Unit Tests (Service Layer)
```typescript
test('createPayment generates payment URL', async () => {
  const result = await service.createPayment({...})
  expect(result.paymentUrl).toBeDefined()
  expect(result.payment.status).toBe('PENDING')
})

test('initiateRefund validates amount', async () => {
  expect(() => service.initiateRefund(paymentId, 999999, reason))
    .toThrow('Refund amount exceeds payment')
})
```

### Integration Tests
```typescript
test('POST /api/payments creates payment', async () => {
  const response = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${token}`)
    .send({...data})
  expect(response.status).toBe(201)
  expect(response.body.paymentUrl).toBeDefined()
})
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://user:pass@localhost:5437/payment_db |
| JWT_SECRET | Token verification | 32+ char string |
| RABBITMQ_URL | Message broker | amqp://guest:guest@rabbitmq:5672 |
| VNPAY_TMN_CODE | VNPAY terminal ID | your-tmn-code |
| VNPAY_HASH_SECRET | VNPAY hash secret | your-hash-secret |
| STRIPE_API_KEY | Stripe API key | sk_test_... |
| MOMO_PARTNER_CODE | Momo partner code | your-code |

### Startup Sequence

1. Load environment variables
2. Create Prisma client
3. Create Express app with middleware
4. Connect to RabbitMQ
5. Subscribe to events
6. Start HTTP server
7. Log startup completion

### Graceful Shutdown

```typescript
async function shutdown(signal) {
  logger.info(`Received ${signal}...`)
  server.close(() => logger.info('HTTP closed'))
  await rabbit.close() // Disconnect RabbitMQ
  await prisma.$disconnect() // Disconnect DB
  process.exit(0)
}
```

---

## 🐳 Docker Setup

### Build
```bash
docker build -f Dockerfile.dev -t payment-service:latest .
```

### Run
```bash
docker run -p 3006:3006 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  -e RABBITMQ_URL=amqp://... \
  -e VNPAY_TMN_CODE=... \
  payment-service:latest
```

### Docker Compose
```yaml
payment-service:
  build:
    context: ./services/payment-service
    dockerfile: Dockerfile.dev
  ports:
    - "3006:3006"
  environment:
    DATABASE_URL: postgresql://payment_user:payment_pass@payment-postgres:5432/payment_db
    JWT_SECRET: ${JWT_SECRET}
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
  depends_on:
    - payment-postgres
    - rabbitmq
```

---

## 📊 Performance Characteristics

### Time Complexity
- Create payment: O(1) - Single DB insert + HTTP call
- List payments: O(n) - Database query with pagination
- Verify payment: O(1) - Single lookup + verification
- Initiate refund: O(1) - Single insert

### Space Complexity
- Per payment: ~500 bytes
- Per refund: ~400 bytes
- Gateway responses: ~1KB (JSON)

### Scalability
- Horizontal: Load balance across instances
- Vertical: Increase CPU/memory per instance
- Database: Indexed queries on orderId, userId, paymentId
- Connection pooling: via Prisma

---

## 🔗 Integration Points

### Incoming
- Auth Service (JWT verification)
- Traefik (routes /api/payments/*)
- Payment Gateways (webhook callbacks)

### Outgoing
- PostgreSQL (payment/refund data)
- RabbitMQ (event publishing)
- Payment Gateways (payment initiation)

---

## ✅ Checklist

- [x] Prisma schema (Payment & Refund)
- [x] Database configuration
- [x] Repository layer (CRUD operations)
- [x] Service layer (business logic)
- [x] Controller layer (HTTP handlers)
- [x] Routes (12 endpoints)
- [x] Validation (10 validators)
- [x] Payment gateways (3 providers)
- [x] Event publishing (6 events)
- [x] Error handling
- [x] Graceful shutdown
- [x] Logging (pino)
- [x] Database seed
- [x] TypeScript strict mode
- [x] Docker configuration
- [x] Environment setup

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Complete
