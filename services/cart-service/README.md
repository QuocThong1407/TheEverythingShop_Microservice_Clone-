# 🛒 Cart Service

Shopping cart management service for The Everything Shop platform.

---

## 📋 Overview

The Cart Service handles:
- ✅ Shopping cart management (Redis-based)
- ✅ Add/update/remove items from cart
- ✅ Cart persistence (7-day TTL)
- ✅ Cart checkout
- ✅ Cart statistics
- ✅ Event publishing (CART_CHECKOUT)
- ✅ No database dependency (Redis only)

---

## 🗂️ Project Structure

```
cart-service/
├── src/
│   ├── config/
│   │   └── redis.ts           # Redis configuration
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── cart/
│   │       ├── index.ts       # Module exports
│   │       ├── cart.controller.ts    # HTTP handlers
│   │       ├── cart.service.ts       # Business logic
│   │       ├── cart.routes.ts        # API routes
│   │       └── cart.validation.ts    # Input validation
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
- `REDIS_URL` - Your Redis connection URL
- `RABBITMQ_URL` - Your RabbitMQ connection URL

### 4. Start Development Server

```bash
npm run dev
```

Service will be available at: `http://localhost:3004`

### 5. Verify

```bash
curl http://localhost:3004/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "cart-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

### Cart Management (6 endpoints)

#### 1. **GET** `/api/cart`

Get user's shopping cart.

**Response:** (200 OK)
```json
{
  "message": "Cart retrieved successfully",
  "cart": {
    "userId": "user-123",
    "items": [
      {
        "id": "item-1",
        "productId": "prod-001",
        "productName": "Pro Laptop",
        "productSku": "LAPTOP-001",
        "quantity": 1,
        "price": 1500,
        "image": "https://...",
        "selectedVariants": { "color": "black", "storage": "512gb" },
        "addedAt": "2026-04-29T10:30:00Z"
      }
    ],
    "subtotal": 1500,
    "itemCount": 1
  }
}
```

---

#### 2. **POST** `/api/cart`

Add item to cart.

**Request Body:**
```json
{
  "productId": "prod-001",
  "productName": "Pro Laptop",
  "productSku": "LAPTOP-001",
  "quantity": 1,
  "price": 1500,
  "image": "https://example.com/laptop.jpg",
  "selectedVariants": {
    "color": "black",
    "storage": "512gb"
  }
}
```

**Response:** (201 Created)

---

#### 3. **PUT** `/api/cart/:itemId`

Update item quantity.

**Request Body:**
```json
{
  "quantity": 2
}
```

---

#### 4. **DELETE** `/api/cart/:itemId`

Remove item from cart.

---

#### 5. **DELETE** `/api/cart`

Clear entire cart.

---

#### 6. **GET** `/api/cart/stats`

Get cart statistics.

**Response:** (200 OK)
```json
{
  "message": "Cart statistics retrieved successfully",
  "stats": {
    "itemCount": 5,
    "subtotal": 2500,
    "uniqueProducts": 3
  }
}
```

---

### Checkout (1 endpoint)

#### 7. **POST** `/api/cart/checkout`

Checkout cart and create order.

**Request Body:**
```json
{
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
}
```

**Response:** (200 OK)
```json
{
  "message": "Checkout successful",
  "orderId": "ORD-1714408200000-1234",
  "items": [...],
  "total": 1692
}
```

**Process:**
1. Validates cart is not empty
2. Publishes CART_CHECKOUT event to Order Service
3. Clears user's cart
4. Returns order ID

---

### Admin Endpoints (2 endpoints)

#### 8. **GET** `/api/cart/admin/carts` (Admin)

Get all user carts.

**Response:** (200 OK)
```json
{
  "message": "User carts retrieved successfully",
  "carts": [
    { "userId": "user-123", "itemCount": 3 },
    { "userId": "user-456", "itemCount": 1 }
  ]
}
```

---

#### 9. **DELETE** `/api/cart/admin/carts/:userId` (Admin)

Delete user's cart (admin only).

---

## 🏗️ Cart Structure (Redis)

### Key Format
```
cart:{userId}
```

### Value Format (JSON Array)
```json
[
  {
    "id": "unique-item-id",
    "productId": "prod-001",
    "productName": "Pro Laptop",
    "productSku": "LAPTOP-001",
    "quantity": 1,
    "price": 1500,
    "image": "https://...",
    "selectedVariants": { "color": "black" },
    "addedAt": "2026-04-29T10:30:00Z"
  }
]
```

### TTL
- **7 days** (604800 seconds)
- Cart automatically expires if inactive for 7 days

---

## 📡 Events

### Published Events

#### CART_CHECKOUT
Published when user checks out.

```json
{
  "type": "CART_CHECKOUT",
  "aggregateId": "user-id",
  "data": {
    "userId": "user-id",
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
    "shippingAddress": {...},
    "shippingCost": 50,
    "tax": 142
  }
}
```

**Recipient**: Order Service (creates order)

---

## 💻 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.3.3 |
| Runtime | Node.js | 18 LTS |
| Framework | Express.js | 5.x |
| Cache | Redis | 7.x |
| Validation | express-validator | 7.0.0 |
| Logging | pino | 8.16.2 |
| Message Broker | RabbitMQ | 3.12 |

---

## 🔐 Security & Features

### Authentication
- ✅ JWT token verification (required for all operations)
- ✅ User context extraction
- ✅ Ownership verification (users see only own cart)
- ✅ Admin-only operations

### Validation
- ✅ Input validation for all endpoints
- ✅ Product ID and name validation
- ✅ Quantity validation (1-1000)
- ✅ Price validation (positive)
- ✅ Address validation (checkout)

### Data Management
- ✅ Redis persistence (7-day TTL)
- ✅ Automatic cart expiration
- ✅ Cart merging (same product + variants = merge)
- ✅ Unique item IDs (UUID v4)

### Event System
- ✅ CART_CHECKOUT event publishing
- ✅ Order Service integration
- ✅ Event error handling

### Error Handling
- ✅ Proper HTTP status codes
- ✅ User-friendly error messages
- ✅ Validation error details
- ✅ Authorization errors

---

## 🎯 Cart Operations

### Add to Cart
- If product + variants already in cart → increase quantity
- If new product + variants → add new item with unique ID
- Auto-save to Redis with TTL

### Update Item
- Update quantity (1-1000)
- If quantity becomes 0 → remove item
- If cart becomes empty → delete Redis key

### Remove Item
- Find and remove by item ID
- If cart empty → delete Redis key

### Clear Cart
- Delete entire Redis key for user

### Checkout
- Validate cart not empty
- Create Order via CART_CHECKOUT event
- Clear cart after order creation

---

## 🧪 Testing Examples

### Get Cart
```bash
curl http://localhost:3004/api/cart \
  -H "Authorization: Bearer {token}"
```

### Add to Cart
```bash
curl -X POST http://localhost:3004/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "productId": "prod-001",
    "productName": "Pro Laptop",
    "productSku": "LAPTOP-001",
    "quantity": 1,
    "price": 1500,
    "selectedVariants": { "color": "black" }
  }'
```

### Update Item Quantity
```bash
curl -X PUT http://localhost:3004/api/cart/{itemId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{ "quantity": 2 }'
```

### Remove Item
```bash
curl -X DELETE http://localhost:3004/api/cart/{itemId} \
  -H "Authorization: Bearer {token}"
```

### Checkout
```bash
curl -X POST http://localhost:3004/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
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

### Get Cart Stats
```bash
curl http://localhost:3004/api/cart/stats \
  -H "Authorization: Bearer {token}"
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
```

---

## 🔗 Integration with Other Services

**Cart Service integrates with:**
- **Auth Service** - User authentication
- **Catalog Service** - Product information (via frontend)
- **Order Service** - Order creation (via CART_CHECKOUT event)
- **API Gateway (Traefik)** - Routes /api/cart/* requests

---

## 💡 Features & Best Practices

### Cart Merging
When adding an item that already exists:
- Same product ID + same selected variants = merge (increase qty)
- Same product ID + different variants = separate items

### Cart Persistence
- 7-day TTL ensures long checkout times
- Automatic cleanup of abandoned carts
- No database needed (Redis only)

### Performance
- In-memory storage (fast)
- Simple GET/SET operations
- No complex queries
- Auto-expiration reduces storage

### Scalability
- Redis handles multiple concurrent users
- No database bottleneck
- Stateless service architecture
- Can scale horizontally

---

## ✅ Implementation Checklist

- [x] Redis configuration
- [x] Cart service (9 methods)
- [x] Cart controller (8 endpoints)
- [x] Validation layer
- [x] Routes configuration
- [x] Error handling
- [x] Event publishing (CART_CHECKOUT)
- [x] Request validation
- [x] Authentication middleware
- [x] Authorization checks
- [x] Environment configuration
- [x] Graceful shutdown
- [x] Health check endpoint
- [x] Express app setup
- [x] Logging configuration
- [x] Error middleware

---

## 📞 Support

- **Health**: GET http://localhost:3004/health
- **Logs**: `npm run dev` (console)
- **Redis**: `redis-cli -h localhost -p 6379`
- **RabbitMQ**: http://localhost:15672 (guest:guest)

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
