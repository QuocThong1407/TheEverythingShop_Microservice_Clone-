# ⚡ Cart Service - Quick API Reference

---

## 🚀 Quick Navigation

- [Setup](#setup)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [cURL Examples](#curl-examples)
- [Common Workflows](#common-workflows)
- [Status Codes](#status-codes)
- [Troubleshooting](#troubleshooting)

---

## Setup

### Start Service
```bash
cd Microservice/services/cart-service
npm install
npm install file:../../shared  # Link shared library
npm run dev                     # Development
# or
npm run build && npm start      # Production
```

### Environment
```
Port: 3004
Redis: redis://localhost:6379
Auth: JWT token in Authorization header
Base URL: http://localhost:3004
API Prefix: /api/cart
```

### Health Check
```bash
curl http://localhost:3004/health
# Response: {"status":"ok","service":"cart-service","timestamp":"..."}
```

---

## Authentication

### Get Auth Token
```bash
# 1. Register (Auth Service)
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
  http://localhost:3004/api/cart
```

### Token Structure
```
Header: Authorization: Bearer {token}
Format: JWT (JSON Web Token)
Expires: 24 hours
Refresh: Use refresh token (7 days)
```

---

## Endpoints

### Summary Table

| Method | Endpoint | Auth | Purpose | Status |
|--------|----------|------|---------|--------|
| GET | /api/cart | ✅ | Get user cart | 200 |
| POST | /api/cart | ✅ | Add item | 201 |
| PUT | /api/cart/:itemId | ✅ | Update quantity | 200 |
| DELETE | /api/cart/:itemId | ✅ | Remove item | 200 |
| DELETE | /api/cart | ✅ | Clear cart | 200 |
| GET | /api/cart/stats | ✅ | Cart statistics | 200 |
| POST | /api/cart/checkout | ✅ | Create order | 200 |
| GET | /api/cart/admin/carts | ✅🔐 | List all carts | 200 |
| DELETE | /api/cart/admin/carts/:userId | ✅🔐 | Delete cart | 200 |

Legend: ✅ = Requires Auth, 🔐 = Admin Only

---

## cURL Examples

### 1. Get Cart
**GET /api/cart**

```bash
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Cart retrieved successfully",
  "cart": {
    "userId": "user-123",
    "items": [],
    "subtotal": 0,
    "itemCount": 0
  }
}
```

---

### 2. Add Item to Cart
**POST /api/cart**

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "productName": "Pro Laptop",
    "productSku": "LAPTOP-PRO-001",
    "quantity": 1,
    "price": 1500,
    "image": "https://example.com/laptop.jpg",
    "selectedVariants": {
      "color": "black",
      "storage": "512gb"
    }
  }'
```

**Response (201):**
```json
{
  "message": "Item added to cart successfully",
  "cart": {
    "userId": "user-123",
    "items": [
      {
        "id": "item-uuid-1",
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "productName": "Pro Laptop",
        "productSku": "LAPTOP-PRO-001",
        "quantity": 1,
        "price": 1500,
        "image": "https://example.com/laptop.jpg",
        "selectedVariants": { "color": "black", "storage": "512gb" },
        "addedAt": "2026-04-29T10:30:00Z"
      }
    ],
    "subtotal": 1500,
    "itemCount": 1
  }
}
```

**Validation Rules:**
- productId: Valid UUID
- productName: 1-255 characters
- productSku: 1-50 characters
- quantity: 1-1000
- price: Must be positive

---

### 3. Add Same Item (Quantity Merge)
**POST /api/cart** (with same product + variants)

```bash
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "productName": "Pro Laptop",
    "productSku": "LAPTOP-PRO-001",
    "quantity": 2,
    "price": 1500,
    "selectedVariants": {
      "color": "black",
      "storage": "512gb"
    }
  }'
```

**Result:**
- Existing item quantity: 1 + 2 = 3
- No duplicate item created

---

### 4. Update Item Quantity
**PUT /api/cart/:itemId**

```bash
ITEM_ID="item-uuid-1"

curl -X PUT http://localhost:3004/api/cart/$ITEM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "quantity": 5
  }'
```

**Response (200):**
```json
{
  "message": "Item updated successfully",
  "cart": {
    "userId": "user-123",
    "items": [
      {
        "id": "item-uuid-1",
        "quantity": 5,
        ...
      }
    ],
    "subtotal": 7500,
    "itemCount": 1
  }
}
```

**Rules:**
- quantity: 1-1000
- If quantity = 0 → item removed
- If last item removed → cart deleted

---

### 5. Remove Item from Cart
**DELETE /api/cart/:itemId**

```bash
ITEM_ID="item-uuid-1"

curl -X DELETE http://localhost:3004/api/cart/$ITEM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Item removed successfully",
  "cart": {
    "userId": "user-123",
    "items": [],
    "subtotal": 0,
    "itemCount": 0
  }
}
```

---

### 6. Clear Entire Cart
**DELETE /api/cart**

```bash
curl -X DELETE http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Cart cleared successfully"
}
```

---

### 7. Get Cart Statistics
**GET /api/cart/stats**

```bash
curl http://localhost:3004/api/cart/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Cart statistics retrieved successfully",
  "stats": {
    "itemCount": 5,
    "subtotal": 5500,
    "uniqueProducts": 3
  }
}
```

---

### 8. Checkout (Create Order)
**POST /api/cart/checkout**

```bash
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shippingAddress": {
      "fullName": "John Doe",
      "phoneNumber": "0123456789",
      "street": "123 Main Street",
      "district": "District 1",
      "city": "Ho Chi Minh",
      "country": "VN"
    },
    "billingAddress": null,
    "shippingCost": 50,
    "tax": 142,
    "notes": "Please handle with care"
  }'
```

**Response (200):**
```json
{
  "message": "Checkout successful",
  "orderId": "ORD-1714408200000-1234",
  "items": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "productName": "Pro Laptop",
      "quantity": 1,
      "unitPrice": 1500
    }
  ],
  "total": 1692
}
```

**What Happens:**
1. ✅ Validates cart not empty
2. ✅ Publishes CART_CHECKOUT to RabbitMQ
3. ✅ Order Service receives event and creates order
4. ✅ Clears user's cart
5. ✅ Returns orderId (can be used to track order)

**Address Requirements:**
- fullName: String
- phoneNumber: Valid phone format
- street: 1+ characters
- district: 1+ characters
- city: 1+ characters
- country: Country code (e.g., VN, US)

---

### 9. Get All Carts (Admin)
**GET /api/cart/admin/carts**

```bash
ADMIN_TOKEN="admin-token-here"

curl http://localhost:3004/api/cart/admin/carts \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "message": "User carts retrieved successfully",
  "carts": [
    {
      "userId": "user-123",
      "itemCount": 3
    },
    {
      "userId": "user-456",
      "itemCount": 1
    }
  ]
}
```

**Requirements:**
- Admin role required
- Token must have admin claim

---

### 10. Delete User Cart (Admin)
**DELETE /api/cart/admin/carts/:userId**

```bash
USER_ID="user-123"
ADMIN_TOKEN="admin-token-here"

curl -X DELETE http://localhost:3004/api/cart/admin/carts/$USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "message": "User cart deleted successfully"
}
```

---

## Common Workflows

### Workflow 1: Simple Purchase

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{...}' | jq -r '.token')

# 2. Get empty cart
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"

# 3. Add item
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...item...}'

# 4. Check stats
curl http://localhost:3004/api/cart/stats \
  -H "Authorization: Bearer $TOKEN"

# 5. Checkout
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...address...}'
```

### Workflow 2: Multi-Item Purchase

```bash
# Add first product
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "prod-001",
    "productName": "Laptop",
    "productSku": "LAP-001",
    "quantity": 1,
    "price": 1500
  }'

# Add second product
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "prod-002",
    "productName": "Mouse",
    "productSku": "MOW-001",
    "quantity": 2,
    "price": 30
  }'

# Update first item
curl -X PUT http://localhost:3004/api/cart/{itemId1} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity": 2}'

# View final cart
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"

# Checkout
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}'
```

### Workflow 3: Cart Modification

```bash
# View cart
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"

# Increase quantity
curl -X PUT http://localhost:3004/api/cart/{itemId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity": 10}'

# Remove specific item
curl -X DELETE http://localhost:3004/api/cart/{itemId} \
  -H "Authorization: Bearer $TOKEN"

# Clear entire cart
curl -X DELETE http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## Status Codes

### Success (2xx)

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET, PUT, DELETE success |
| 201 | Created | POST success (item added) |

### Client Error (4xx)

| Code | Meaning | When |
|------|---------|------|
| 400 | Bad Request | Invalid data format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Admin-only endpoint, user lacks permissions |
| 404 | Not Found | Item/cart not found |
| 422 | Unprocessable | Validation failed |

### Server Error (5xx)

| Code | Meaning | When |
|------|---------|------|
| 500 | Internal Server Error | Unexpected error |
| 503 | Unavailable | Redis/RabbitMQ down |

### Error Response Format
```json
{
  "message": "Error message",
  "errors": [
    {
      "field": "productId",
      "message": "Invalid UUID format"
    }
  ]
}
```

---

## Validation Errors

### Add Item - Invalid Quantity
```bash
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "productName": "Laptop",
    "productSku": "LAP-001",
    "quantity": 9999,  # ❌ Too high (max 1000)
    "price": 1500
  }'
```

**Response (422):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be between 1 and 1000"
    }
  ]
}
```

### Checkout - Missing Address
```bash
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shippingAddress": null,  # ❌ Required
    "shippingCost": 50,
    "tax": 142
  }'
```

**Response (422):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "shippingAddress",
      "message": "Shipping address is required"
    }
  ]
}
```

---

## Troubleshooting

### 1. "Invalid token" (401)

**Problem**: Authorization header invalid

**Solutions**:
```bash
# Check token format
# Should be: Authorization: Bearer <token>
# NOT: Authorization: <token>

# Get new token
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"Pass123"}'
```

---

### 2. "Redis connection error" (503)

**Problem**: Redis not running

**Solutions**:
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Start Redis (if using docker-compose)
docker-compose -f docker-compose.dev.yml up redis

# Or local
redis-server
```

---

### 3. "RabbitMQ connection error" (503)

**Problem**: RabbitMQ not running

**Solutions**:
```bash
# Check RabbitMQ status
curl http://localhost:15672  # Management UI

# Start RabbitMQ (docker-compose)
docker-compose -f docker-compose.dev.yml up rabbitmq

# Or manually
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management
```

---

### 4. "Product ID must be UUID" (422)

**Problem**: Invalid productId format

**Solution**:
```bash
# Correct format (UUID v4)
"productId": "550e8400-e29b-41d4-a716-446655440000"

# NOT:
"productId": "prod-001"  # ❌
"productId": "123"       # ❌
```

---

### 5. "Cart is empty" checkout error (400)

**Problem**: Trying to checkout with empty cart

**Solution**:
```bash
# Add items first
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...item...}'

# Then checkout
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}'
```

---

### 6. "Admin role required" (403)

**Problem**: Using non-admin token for admin endpoints

**Solution**:
```bash
# Use admin token for admin routes
# Admin endpoints:
# - GET /api/cart/admin/carts
# - DELETE /api/cart/admin/carts/:userId

# Non-admin users can only access:
# - GET /api/cart
# - POST /api/cart
# - PUT /api/cart/:itemId
# - DELETE /api/cart/:itemId
# - GET /api/cart/stats
# - POST /api/cart/checkout
```

---

### 7. "Item not found" (404)

**Problem**: itemId doesn't exist in cart

**Solution**:
```bash
# Get valid itemIds first
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer $TOKEN"

# Use itemId from response
# Then update/delete
curl -X PUT http://localhost:3004/api/cart/{VALID_ITEM_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"quantity": 5}'
```

---

## Environment Variables

### Required
```
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-32-chars-min
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### Optional
```
NODE_ENV=development          # or production
PORT=3004
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3005
```

---

## Quick Checklist

- [ ] Redis running (`redis-cli ping` → PONG)
- [ ] RabbitMQ running (`curl http://localhost:15672` → 200)
- [ ] Auth Service running (`http://localhost:3001/health` → ok)
- [ ] Cart Service running (`http://localhost:3004/health` → ok)
- [ ] Valid JWT token (from Auth Service)
- [ ] .env configured correctly

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Cart Service on Port 3004
