# 🔧 Cart Service - Implementation Details

---

## 📁 File Structure

### Core Files (8)

#### 1. **src/index.ts** (Entry Point)
- Initializes Express app
- Connects to Redis
- Initializes RabbitMQ connection
- Starts HTTP server on port 3004
- Implements graceful shutdown
- Handles process signals (SIGTERM, SIGINT)

**Key Functions:**
```typescript
const app = createApp()
const redisClient = await connectRedis()
const rabbit = new RabbitMQService()
await rabbit.initialize()
const server = app.listen(PORT, ...)
// Graceful shutdown on signals
```

---

#### 2. **src/app.ts** (Express Setup)
- Configures Express middleware stack
- Sets up pinoHttp logging
- Parses JSON/URL-encoded bodies (10MB limit)
- Attaches currentUser middleware
- Mounts cart routes
- Implements health check endpoint
- Centralized error handler

**Middleware Chain:**
```
1. pinoHttp logging
2. json/urlencoded parsing (10MB)
3. currentUser extraction
4. /health endpoint (no auth)
5. /api/cart routes (requires auth)
6. 404 handler
7. Error handler (last)
```

**Health Endpoint:**
```
GET /health → {status, service, timestamp}
```

---

#### 3. **src/config/redis.ts** (Redis Configuration)
- Creates Redis client using @redis/client
- Connection: `redis://localhost:6379` (via REDIS_URL)
- Event handlers: connect, error, ready, disconnect
- Exports connected client instance
- Graceful connection closure

**Key Code:**
```typescript
const client = createClient({ url: REDIS_URL })
await client.connect()
client.on('error', (err) => logger.error(err))
export default client
```

---

#### 4. **src/modules/cart/cart.service.ts** (Business Logic)
- **9 core methods** for cart operations
- Handles Redis operations
- Manages cart TTL (7 days)
- Publishes events to RabbitMQ

**Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `getCart(userId)` | Fetch user's cart | Cart object or empty |
| `addToCart(userId, item)` | Add/merge item | Updated cart |
| `updateCartItem(userId, itemId, qty)` | Update quantity | Updated cart |
| `removeFromCart(userId, itemId)` | Remove item | Updated cart |
| `clearCart(userId)` | Empty entire cart | void |
| `checkout(userId, data)` | Create order | {orderId, items, total} |
| `getCartStats(userId)` | Get cart statistics | {itemCount, subtotal, uniqueProducts} |
| `getUserCarts()` | List all carts (admin) | Cart[] |
| `deleteUserCart(userId)` | Delete cart (admin) | void |

**Cart TTL:**
```typescript
const TTL_SECONDS = 7 * 24 * 60 * 60  // 7 days = 604800 seconds
redisClient.expire(`cart:${userId}`, TTL_SECONDS)
```

**Item Merging Logic:**
```typescript
// Same product + variants = merge quantities
const existingItem = items.find(
  i => i.productId === item.productId && 
       JSON.stringify(i.selectedVariants) === JSON.stringify(item.selectedVariants)
)
if (existingItem) {
  existingItem.quantity += item.quantity
} else {
  items.push({...item, id: uuidv4()})
}
```

**Checkout Event:**
```typescript
await publishEvent('CART_CHECKOUT', {
  userId,
  items: cart.items,
  shippingAddress: checkoutData.shippingAddress,
  shippingCost: checkoutData.shippingCost,
  tax: checkoutData.tax,
  subtotal: cart.subtotal,
  total: cart.subtotal + checkoutData.shippingCost + checkoutData.tax
})
```

---

#### 5. **src/modules/cart/cart.controller.ts** (HTTP Handlers)
- **8 endpoint handlers** with error handling
- Extracts userId from JWT middleware
- Validates input via express-validator
- Returns standardized responses

**Handlers:**

| Handler | Route | Method | Purpose |
|---------|-------|--------|---------|
| `getCart` | /api/cart | GET | Fetch user's cart |
| `addToCart` | /api/cart | POST | Add item |
| `updateCartItem` | /api/cart/:itemId | PUT | Update item qty |
| `removeFromCart` | /api/cart/:itemId | DELETE | Remove item |
| `clearCart` | /api/cart | DELETE | Clear cart |
| `checkout` | /api/cart/checkout | POST | Checkout |
| `getCartStats` | /api/cart/stats | GET | Get stats |
| `getAllUserCarts` | /api/cart/admin/carts | GET | Admin: list all |
| `deleteUserCart` | /api/cart/admin/:userId | DELETE | Admin: delete |

**Response Pattern:**
```typescript
res.status(200).json({
  message: 'Action successful',
  cart: {...},
  ...otherFields
})
```

---

#### 6. **src/modules/cart/cart.routes.ts** (Route Configuration)
- Defines 8 API routes with middleware
- Applies authentication (`requireAuth`)
- Applies validation (`validateRequest`)
- Exports router for mounting in app

**Route Structure:**
```typescript
// Public routes
router.get('/health', getHealth)

// Authenticated routes
router.get('/', requireAuth, validateRequest, getCart)
router.post('/', requireAuth, validateAddToCart, validateRequest, addToCart)
router.put('/:itemId', requireAuth, validateUpdateItem, validateRequest, updateItem)
router.delete('/:itemId', requireAuth, validateRemoveItem, validateRequest, removeItem)
router.delete('/', requireAuth, validateClear, validateRequest, clearCart)

// Stats & Checkout
router.get('/stats', requireAuth, getCartStats)
router.post('/checkout', requireAuth, validateCheckout, validateRequest, checkout)

// Admin routes
router.get('/admin/carts', requireAuth, requireAdmin, getAllCarts)
router.delete('/admin/carts/:userId', requireAuth, requireAdmin, deleteUserCart)
```

---

#### 7. **src/modules/cart/cart.validation.ts** (Input Validation)
- **5 validator chains** for all operations
- Uses express-validator rules
- Validates structure, types, and ranges
- Returns validation errors in response

**Validators:**

| Validator | Endpoint | Fields | Rules |
|-----------|----------|--------|-------|
| `validateAddToCart` | POST /api/cart | productId, productName, productSku, quantity, price | All required, qty 1-1000, price > 0 |
| `validateUpdateCartItem` | PUT /api/cart/:itemId | quantity | Required, 1-1000 |
| `validateRemoveFromCart` | DELETE /api/cart/:itemId | itemId | Required, UUID format |
| `validateCheckout` | POST /api/cart/checkout | shippingAddress | Required, nested validation |
| `validateCartClear` | DELETE /api/cart | N/A | No body |

**Validation Rules:**
```typescript
body('productId').isUUID().notEmpty()
body('productName').isString().trim().notEmpty().isLength({min: 1, max: 255})
body('productSku').isString().trim().notEmpty().isLength({min: 1, max: 50})
body('quantity').isInt({min: 1, max: 1000})
body('price').isFloat({min: 0})
body('shippingAddress.street').notEmpty().trim()
body('shippingAddress.district').notEmpty().trim()
body('shippingAddress.city').notEmpty().trim()
body('shippingAddress.country').notEmpty().trim()
body('shippingAddress.phoneNumber').isMobilePhone()
```

---

#### 8. **src/modules/cart/index.ts** (Module Exports)
- Exports CartService
- Exports controllers, routes, validators
- Single entry point for cart module

---

### Configuration Files (6)

#### 9. **package.json**
- Service name: `cart-service`
- Main: `dist/index.js`
- Type: `module` (ES modules)
- Dependencies: express, redis, uuid, pino, @teleshop/common
- Dev: typescript, tsx, jest, eslint, ts-jest
- Scripts: start, dev, build, lint, test

---

#### 10. **tsconfig.json**
- Target: ES2020
- Module: ES2020 (ES modules)
- Strict: true (all strict flags)
- NoUnusedLocals: true
- NoUnusedParameters: true
- Declaration: true
- Source maps: enabled

---

#### 11. **.env**
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for token verification
- `RABBITMQ_URL`: RabbitMQ connection string
- `NODE_ENV`: development/production
- `PORT`: 3004
- Service URLs for other services

---

#### 12. **Dockerfile.dev**
- Base: `node:18-alpine`
- Workdir: `/app`
- Install: `npm ci` (clean install)
- Build: `npm run build`
- Expose: Port 3004
- CMD: `npm start`

---

#### 13. **.gitignore**
- Excludes: node_modules, dist, .env, *.log, .DS_Store

---

#### 14. **jest.config.js**
- Preset: ts-jest
- Test environment: node
- Coverage threshold: 70%
- Test pattern: src/**/*.test.ts

---

#### 15. **eslint.config.js**
- Parser: @typescript-eslint/parser
- Rules: no-unused-vars (warn), no-explicit-any (warn)
- Base config: typescript-eslint recommended

---

## 🏗️ Architecture

### Layer Structure

```
Controllers (HTTP Handlers)
    ↓
Services (Business Logic)
    ↓
Redis Client
    ↓
Message Broker (RabbitMQ)
```

### Data Flow: Add to Cart

```
1. POST /api/cart
2. Express routing → cart.routes.ts
3. Middleware chain:
   - requireAuth (verify JWT)
   - validateAddToCart (validate input)
   - validateRequest (handle validation errors)
4. Controller: addToCart()
5. Service: addToCart()
   - Get current cart from Redis
   - Merge item (if product+variants exist)
   - Set TTL (7 days)
   - Save back to Redis
6. Return response (201)
```

### Data Flow: Checkout

```
1. POST /api/cart/checkout
2. HTTP → Controller: checkout()
3. Service: checkout()
   - Validate cart not empty
   - Publish CART_CHECKOUT event to RabbitMQ
   - Clear cart from Redis
   - Return orderId, items, total
4. RabbitMQ → Order Service
   - Receives CART_CHECKOUT
   - Creates Order in order_db
   - Publishes ORDER_CREATED
5. Response: {orderId, items, total}
```

---

## 🗂️ Redis Schema

### Key Format
```
cart:{userId}
```

### Value Structure (JSON)
```typescript
interface CartItem {
  id: string                    // UUID v4
  productId: string            // UUID
  productName: string          // 1-255 chars
  productSku: string           // 1-50 chars
  quantity: number             // 1-1000
  price: number                // > 0
  image?: string               // URL
  selectedVariants?: {         // Product options
    [key: string]: string
  }
  addedAt: string              // ISO timestamp
}

type CartValue = CartItem[]
```

### Operations

| Operation | Command | Example |
|-----------|---------|---------|
| Get cart | `GET cart:{userId}` | `GET cart:user-123` |
| Set cart | `SET cart:{userId} value EX ttl` | `SET cart:user-123 {...} EX 604800` |
| Delete cart | `DEL cart:{userId}` | `DEL cart:user-123` |
| Check exists | `EXISTS cart:{userId}` | `EXISTS cart:user-123` |
| Set TTL | `EXPIRE key seconds` | `EXPIRE cart:user-123 604800` |

---

## 🔌 Event System

### Published Events

#### CART_CHECKOUT
- **Topic**: `cart.checkout`
- **Recipient**: Order Service
- **Data**: Cart items, shipping address, costs
- **Handling**: Order Service creates order

**Message Structure:**
```json
{
  "id": "msg-uuid",
  "type": "CART_CHECKOUT",
  "aggregateId": "user-123",
  "data": {
    "userId": "user-123",
    "items": [...],
    "shippingAddress": {...},
    "shippingCost": 50,
    "tax": 142,
    "subtotal": 1500,
    "total": 1692
  },
  "timestamp": "2026-04-29T10:30:00Z"
}
```

---

## 🔐 Security Model

### Authentication
- **Endpoint**: All /api/cart/* require `requireAuth` middleware
- **Token**: JWT in Authorization header
- **Extraction**: currentUser middleware parses token

### Authorization
- **User Ownership**: Users see only their own cart
- **Admin Routes**: `/api/cart/admin/*` require admin role
- **Checks**: Service layer verifies userId from JWT

### Input Validation
- **Validator**: express-validator chains
- **Sanitization**: trim(), isUUID(), isInt(), isFloat()
- **Error Response**: 422 with validation details

---

## 🧪 Testing Strategy

### Unit Tests (Service Layer)
```typescript
test('addToCart merges items with same product+variants', () => {
  // Add item 1: prod-001, black
  // Add item 2: prod-001, black (should merge)
  // Assert quantity = 2
})

test('checkout publishes event and clears cart', async () => {
  // Publish event mock
  // Call checkout()
  // Assert event published
  // Assert cart cleared
})
```

### Integration Tests (Controller → Service → Redis)
```typescript
test('POST /api/cart adds item and returns updated cart', async () => {
  const response = await request(app)
    .post('/api/cart')
    .set('Authorization', `Bearer ${token}`)
    .send({...item})
  expect(response.status).toBe(201)
  expect(response.body.cart.itemCount).toBe(1)
})
```

---

## ⚙️ Configuration Details

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| REDIS_URL | Redis connection | redis://localhost:6379 |
| JWT_SECRET | Token verification | 32+ char string |
| RABBITMQ_URL | Message broker | amqp://guest:guest@rabbitmq:5672 |
| NODE_ENV | Environment | development/production |
| PORT | HTTP port | 3004 |
| AUTH_SERVICE_URL | Auth service | http://auth-service:3001 |
| CATALOG_SERVICE_URL | Catalog service | http://catalog-service:3003 |

### Startup Sequence

1. Load environment variables from .env
2. Create Express app with middleware
3. Connect to Redis
4. Initialize RabbitMQ connection
5. Start HTTP server on PORT
6. Log "Server running on port 3004"

### Graceful Shutdown

```typescript
async function shutdown() {
  console.log('Shutting down...')
  server.close(() => {
    console.log('HTTP server closed')
  })
  await redisClient.quit()
  console.log('Redis disconnected')
  await rabbit.close()
  console.log('RabbitMQ disconnected')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

---

## 🐳 Docker Setup

### Build
```bash
docker build -f Dockerfile.dev -t cart-service:latest .
```

### Run
```bash
docker run -p 3004:3004 \
  -e REDIS_URL=redis://redis:6379 \
  -e JWT_SECRET=your-secret \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  cart-service:latest
```

### Docker Compose Integration
```yaml
cart-service:
  build:
    context: ./services/cart-service
    dockerfile: Dockerfile.dev
  ports:
    - "3004:3004"
  environment:
    REDIS_URL: redis://redis:6379
    JWT_SECRET: ${JWT_SECRET}
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
  depends_on:
    - redis
    - rabbitmq
  networks:
    - teleshop-network
```

---

## 📊 Performance Characteristics

### Time Complexity
- **getCart**: O(1) - Single Redis GET
- **addToCart**: O(n) - Linear scan for merge (n = items in cart)
- **checkout**: O(n) - Event publish + clear

### Space Complexity
- **Per Cart**: O(n) - n items stored
- **Average**: ~1-10 items per cart
- **Redis Memory**: ~500 bytes per item

### Scalability
- **Horizontal**: Can run multiple instances (Redis handles concurrency)
- **Vertical**: Limited by machine resources
- **Database**: None (Redis only)

---

## 🔗 Integration Points

### Incoming
- **Auth Service** - JWT verification (currentUser middleware)
- **Traefik** - Routes /api/cart/* requests

### Outgoing
- **Redis** - Cart storage (GET/SET/DEL)
- **RabbitMQ** - CART_CHECKOUT event publish
- **Order Service** - Receives CART_CHECKOUT event

---

## ✅ Checklist

- [x] Redis configuration
- [x] Service layer (9 methods)
- [x] Controller layer (8 handlers)
- [x] Routes (8 endpoints)
- [x] Validation (5 validators)
- [x] Error handling
- [x] Event publishing
- [x] Authentication middleware
- [x] Authorization checks
- [x] Health endpoint
- [x] Graceful shutdown
- [x] Logging (pino)
- [x] Environment config
- [x] TypeScript strict mode
- [x] Docker configuration

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Complete
