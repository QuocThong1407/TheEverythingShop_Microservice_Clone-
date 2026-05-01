# ⚡ Payment Service - Quick API Reference

---

## 🚀 Quick Navigation

- [Setup](#setup)
- [Authentication](#authentication)
- [Payment Endpoints](#payment-endpoints)
- [Refund Endpoints](#refund-endpoints)
- [cURL Examples](#curl-examples)
- [Status Codes](#status-codes)
- [Troubleshooting](#troubleshooting)

---

## Setup

### Start Service
```bash
cd Microservice/services/payment-service
npm install
npm install file:../../shared
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### Environment
```
Port: 3006
Database: PostgreSQL on 5437
RabbitMQ: amqp://rabbitmq:5672
Auth: JWT in Authorization header
Base URL: http://localhost:3006
API Prefix: /api/payments
```

### Health Check
```bash
curl http://localhost:3006/health
# Response: {"status":"ok","service":"payment-service","timestamp":"..."}
```

---

## Authentication

### Get Auth Token
```bash
# From Auth Service
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'

# Response includes:
# "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Request with Token
```bash
curl -H "Authorization: Bearer {YOUR_TOKEN}" \
  http://localhost:3006/api/payments
```

---

## Payment Endpoints

### Summary Table

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/payments | ✅ | Create payment |
| GET | /api/payments | ✅ | List payments |
| GET | /api/payments/:paymentId | ✅ | Get payment |
| GET | /api/payments/order/:orderId | ✅ | Get by order |
| POST | /api/payments/:paymentId/confirm | ✅ | Confirm payment |
| POST | /api/payments/:paymentId/cancel | ✅ | Cancel payment |
| POST | /api/payments/webhook/vnpay | ❌ | VNPAY webhook |
| POST | /api/payments/webhook/momo | ❌ | Momo webhook |

---

## Refund Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/payments/:paymentId/refund | ✅🔐 | Initiate refund |
| GET | /api/payments/refund/:refundId | ✅🔐 | Get refund |
| GET | /api/payments/refunds | ✅🔐 | List refunds |
| POST | /api/payments/refund/:refundId/confirm | ✅🔐 | Confirm refund |
| GET | /api/payments/:paymentId/refunds | ✅ | Get payment refunds |

Legend: ✅ = Requires Auth, 🔐 = Admin Only

---

## cURL Examples

### 1. Create Payment

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3006/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 1500,
    "currency": "VND",
    "paymentMethod": "VNPAY",
    "metadata": { "description": "Order items" }
  }'
```

**Response (201):**
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

### 2. List Payments

```bash
curl "http://localhost:3006/api/payments?userId=user-123&status=COMPLETED&skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `userId` (optional)
- `orderId` (optional)
- `status` (optional) - PENDING, COMPLETED, FAILED, etc.
- `skip` (optional, default=0)
- `take` (optional, default=10)

**Response (200):**
```json
{
  "message": "Payments retrieved successfully",
  "payments": [
    {
      "id": "pay-1",
      "orderId": "ord-1",
      "userId": "user-1",
      "amount": "1500.00",
      "currency": "VND",
      "status": "COMPLETED",
      "paymentMethod": "VNPAY",
      "createdAt": "2026-04-29T10:30:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 10
}
```

---

### 3. Get Payment

```bash
PAYMENT_ID="pay-uuid-here"

curl http://localhost:3006/api/payments/$PAYMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
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

### 4. Get Payment by Order

```bash
ORDER_ID="order-uuid"

curl http://localhost:3006/api/payments/order/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Confirm Payment

```bash
curl -X POST http://localhost:3006/api/payments/$PAYMENT_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "transactionId": "VNPAY_TXN_001",
    "gatewayResponse": {
      "responseCode": "00",
      "message": "Approved"
    }
  }'
```

**Response (200):**
```json
{
  "message": "Payment confirmed successfully",
  "payment": {
    "id": "pay-uuid",
    "orderId": "order-uuid",
    "status": "AUTHORIZED",
    "transactionId": "VNPAY_TXN_001",
    "updatedAt": "2026-04-29T10:35:00Z"
  }
}
```

---

### 6. Cancel Payment

```bash
curl -X POST http://localhost:3006/api/payments/$PAYMENT_ID/cancel \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Payment cancelled successfully",
  "payment": {
    "id": "pay-uuid",
    "orderId": "order-uuid",
    "status": "CANCELLED",
    "updatedAt": "2026-04-29T10:35:00Z"
  }
}
```

---

### 7. Initiate Refund (Admin)

```bash
ADMIN_TOKEN="admin-token-here"

curl -X POST http://localhost:3006/api/payments/$PAYMENT_ID/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "amount": 500,
    "reason": "Customer requested refund due to damaged product",
    "metadata": { "requestId": "REQ-001" }
  }'
```

**Response (201):**
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

**Validation:**
- amount > 0 and ≤ payment amount
- reason: 10-500 characters
- Can't refund > total paid amount

---

### 8. Get Refund

```bash
REFUND_ID="refund-uuid"

curl http://localhost:3006/api/payments/refund/$REFUND_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "message": "Refund retrieved successfully",
  "refund": {
    "id": "refund-uuid",
    "paymentId": "pay-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": "500.00",
    "reason": "...",
    "status": "PENDING",
    "refundTransactionId": null,
    "createdAt": "2026-04-29T10:40:00Z",
    "updatedAt": "2026-04-29T10:40:00Z"
  }
}
```

---

### 9. List Refunds (Admin)

```bash
curl "http://localhost:3006/api/payments/refunds?paymentId=pay-uuid&status=COMPLETED" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Query Parameters:**
- `paymentId` (optional)
- `orderId` (optional)
- `status` (optional)
- `skip` (optional)
- `take` (optional)

---

### 10. Confirm Refund (Admin)

```bash
curl -X POST http://localhost:3006/api/payments/refund/$REFUND_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "refundTransactionId": "REFUND_TXN_001",
    "status": "COMPLETED",
    "gatewayResponse": {
      "refundCode": "00",
      "message": "Refund successful"
    }
  }'
```

**Response (200):**
```json
{
  "message": "Refund confirmed successfully",
  "refund": {
    "id": "refund-uuid",
    "paymentId": "pay-uuid",
    "status": "COMPLETED",
    "refundTransactionId": "REFUND_TXN_001",
    "updatedAt": "2026-04-29T10:45:00Z"
  }
}
```

---

### 11. Get Refunds for Payment

```bash
curl http://localhost:3006/api/payments/$PAYMENT_ID/refunds \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Refunds retrieved successfully",
  "refunds": [
    {
      "id": "refund-1",
      "paymentId": "pay-uuid",
      "orderId": "order-uuid",
      "amount": "500.00",
      "status": "COMPLETED",
      "reason": "Customer requested refund"
    }
  ],
  "total": 1
}
```

---

## Status Codes

### Success (2xx)

| Code | When |
|------|------|
| 200 | GET, PUT, POST success (except create) |
| 201 | POST create success |

### Client Error (4xx)

| Code | When |
|------|------|
| 400 | Invalid request data |
| 401 | Missing/invalid token |
| 403 | Admin-only endpoint |
| 404 | Resource not found |
| 409 | Conflict (duplicate payment for order) |
| 422 | Validation failed |

### Server Error (5xx)

| Code | When |
|------|------|
| 500 | Server error |
| 503 | Database/RabbitMQ down |

### Error Response Format

```json
{
  "message": "Error message",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
```

---

## Workflows

### Workflow 1: Simple Payment (VNPAY)

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{...}' | jq -r '.token')

# 2. Create payment
RESPONSE=$(curl -s -X POST http://localhost:3006/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 1500,
    "currency": "VND",
    "paymentMethod": "VNPAY"
  }')

PAYMENT_ID=$(echo $RESPONSE | jq -r '.payment.id')
PAYMENT_URL=$(echo $RESPONSE | jq -r '.paymentUrl')

# 3. User goes to $PAYMENT_URL and completes payment

# 4. VNPAY sends webhook to /api/payments/webhook/vnpay
# Service automatically verifies and publishes PAYMENT_SUCCESS

# 5. Order Service receives event and creates order
```

---

### Workflow 2: Payment with Refund (Admin)

```bash
# 1-4. (Same as Workflow 1 - payment completed)

# 5. Admin decides to refund
curl -X POST http://localhost:3006/api/payments/$PAYMENT_ID/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "amount": 500,
    "reason": "Product damaged, customer requested partial refund"
  }'

# 6. Refund initiated - status = PENDING

# 7. Admin processes refund with gateway
curl -X POST http://localhost:3006/api/payments/refund/$REFUND_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "refundTransactionId": "REFUND_TXN_001",
    "status": "COMPLETED"
  }'

# 8. Service publishes REFUND_COMPLETED event
# 9. Notification Service sends refund email to customer
```

---

## Troubleshooting

### 1. "Invalid token" (401)

**Problem**: Authorization header missing/invalid

**Solutions**:
```bash
# Check token format
# Should be: Authorization: Bearer <token>

# Get new token
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"Pass123"}'
```

---

### 2. "Payment already exists for order" (409)

**Problem**: Trying to create payment twice for same order

**Solution**:
```bash
# Use GET to fetch existing payment
curl http://localhost:3006/api/payments/order/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. "Cannot confirm payment with status FAILED" (409)

**Problem**: Trying to confirm already failed payment

**Solution**:
- Create new payment instead
- Or cancel and retry with correct data

---

### 4. "Refund amount exceeds payment amount" (400)

**Problem**: Refund > original payment

**Solution**:
```bash
# Check original payment amount
curl http://localhost:3006/api/payments/$PAYMENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.payment.amount'

# Use amount ≤ that value
```

---

### 5. "Admin role required" (403)

**Problem**: Non-admin trying admin endpoints

**Solution**:
```bash
# Use admin token for:
# - POST /api/payments/:paymentId/refund
# - GET /api/payments/refund/:refundId
# - GET /api/payments/refunds
# - POST /api/payments/refund/:refundId/confirm
```

---

### 6. "Database connection failed" (503)

**Problem**: PostgreSQL not running

**Solutions**:
```bash
# Check PostgreSQL
psql -U payment_user -d payment_db

# Start with docker-compose
docker-compose up payment-postgres

# Or manually
docker run -d \
  --name payment-postgres \
  -e POSTGRES_USER=payment_user \
  -e POSTGRES_PASSWORD=payment_pass \
  -e POSTGRES_DB=payment_db \
  -p 5437:5432 \
  postgres:15
```

---

### 7. "RabbitMQ connection error" (503)

**Problem**: RabbitMQ not running

**Solutions**:
```bash
# Start RabbitMQ
docker-compose up rabbitmq

# Or manually
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.12-management
```

---

### 8. "VNPAY configuration incomplete" (warning)

**Problem**: Missing VNPAY credentials

**Solution**: Update .env
```
VNPAY_TMN_CODE=your-actual-code
VNPAY_HASH_SECRET=your-actual-secret
```

---

## Commands

```bash
npm run start          # Production
npm run dev            # Development
npm run build          # Compile TypeScript
npm run lint           # ESLint
npm run test           # Jest
npm run test:watch     # Watch mode
npm run prisma:migrate # Run migrations
npm run prisma:seed    # Seed demo data
npm run prisma:studio  # Prisma Studio UI
```

---

## Demo Data (after seeding)

**3 Payments:**
1. $1,500 VNPAY - COMPLETED
2. $2,500 Stripe - PENDING
3. $800 Momo - COMPLETED

**1 Refund:**
- $500 refund on Payment 1 - COMPLETED

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Payment Service on Port 3006
