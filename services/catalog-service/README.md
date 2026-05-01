# 📦 Catalog Service

Product catalog management, reviews, and promotions service for The Everything Shop platform.

---

## 📋 Overview

The Catalog Service handles:
- ✅ Product catalog management (CRUD)
- ✅ Category management
- ✅ Product reviews and ratings
- ✅ Promotions and discounts
- ✅ Inventory management
- ✅ Event publishing (product updates, inventory changes)
- ✅ Event subscription (order events for inventory)

---

## 🗂️ Project Structure

```
catalog-service/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Database migrations
├── src/
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── catalog/
│   │       ├── index.ts       # Module exports
│   │       ├── catalog.controller.ts    # HTTP handlers
│   │       ├── catalog.service.ts       # Business logic
│   │       ├── catalog.repository.ts    # Database operations
│   │       ├── catalog.routes.ts        # API routes
│   │       └── catalog.validation.ts    # Input validation
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

Service will be available at: `http://localhost:3003`

### 6. Verify

```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "catalog-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

### Category Endpoints

#### 1. **POST** `/api/catalog/categories` (Admin)

Create new category.

**Request Body:**
```json
{
  "name": "Electronics",
  "slug": "electronics",
  "description": "Electronic devices"
}
```

**Response:** (201 Created)

---

#### 2. **GET** `/api/catalog/categories`

Get all categories.

**Response:** (200 OK)
```json
{
  "message": "Categories retrieved successfully",
  "categories": [
    {
      "id": "clv...",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices",
      "image": null,
      "createdAt": "2026-04-29T10:30:00Z",
      "updatedAt": "2026-04-29T10:30:00Z"
    }
  ]
}
```

---

#### 3. **GET** `/api/catalog/categories/:categoryId`

Get category by ID.

---

#### 4. **PUT** `/api/catalog/categories/:categoryId` (Admin)

Update category.

---

### Product Endpoints

#### 5. **POST** `/api/catalog/products` (Sellers)

Create new product.

**Request Body:**
```json
{
  "name": "Pro Laptop",
  "description": "High-performance laptop for professionals",
  "sku": "LAPTOP-001",
  "price": 1500,
  "costPrice": 1000,
  "stock": 50,
  "categoryId": "clv...",
  "image": "https://example.com/laptop.jpg"
}
```

**Response:** (201 Created)

---

#### 6. **GET** `/api/catalog/products`

List products with pagination and filtering.

**Query Parameters:**
- `categoryId`: Filter by category
- `sellerId`: Filter by seller
- `status`: ACTIVE, INACTIVE, or DISCONTINUED
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort by name, price, rating, or createdAt

**Response:** (200 OK)
```json
{
  "message": "Products retrieved successfully",
  "products": [...],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

---

#### 7. **GET** `/api/catalog/products/:productId`

Get product by ID.

---

#### 8. **PUT** `/api/catalog/products/:productId` (Seller who owns product)

Update product.

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 1200,
  "stock": 45
}
```

---

### Review Endpoints

#### 9. **POST** `/api/catalog/products/:productId/reviews` (Authenticated users)

Create product review.

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excellent product!",
  "comment": "This product exceeded my expectations. Highly recommended!"
}
```

**Validation:**
- `rating`: 1-5
- `title`: 3-100 characters
- `comment`: 10-1000 characters

---

#### 10. **GET** `/api/catalog/products/:productId/reviews`

Get product reviews.

**Response:** (200 OK)
```json
{
  "message": "Reviews retrieved successfully",
  "reviews": [...],
  "count": 5
}
```

---

#### 11. **GET** `/api/catalog/reviews/:reviewId`

Get review by ID.

---

#### 12. **DELETE** `/api/catalog/reviews/:reviewId` (Review author)

Delete review.

---

### Promotion Endpoints

#### 13. **POST** `/api/catalog/products/:productId/promotions` (Seller)

Create promotion.

**Request Body:**
```json
{
  "name": "Summer Sale",
  "description": "20% off all products",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "maxDiscount": 300,
  "startDate": "2026-05-01T00:00:00Z",
  "endDate": "2026-05-31T23:59:59Z",
  "usageLimit": 1000
}
```

---

#### 14. **GET** `/api/catalog/products/:productId/promotions`

Get active promotions for product.

---

#### 15. **GET** `/api/catalog/promotions/:promotionId`

Get promotion by ID.

---

#### 16. **PUT** `/api/catalog/promotions/:promotionId` (Seller)

Update promotion.

---

## 🗄️ Database Schema

### Category Model
```
- id: String (PK)
- name: String
- slug: String (UNIQUE)
- description: String?
- image: String?
- products: Product[]
- createdAt: DateTime
- updatedAt: DateTime
```

### Product Model
```
- id: String (PK)
- name: String
- description: String
- sku: String (UNIQUE)
- price: Float
- costPrice: Float?
- stock: Int
- status: String (ACTIVE, INACTIVE, DISCONTINUED)
- sellerId: String (from Auth Service)
- categoryId: String (FK → Category)
- image: String?
- images: String[]
- attributes: Json?
- rating: Float
- ratingCount: Int
- reviewCount: Int
- reviews: Review[]
- promotions: Promotion[]
- createdAt: DateTime
- updatedAt: DateTime
```

### Review Model
```
- id: String (PK)
- productId: String (FK → Product)
- userId: String (from Auth Service)
- rating: Int (1-5)
- title: String
- comment: String
- helpful: Int
- status: String (PENDING, APPROVED, REJECTED)
- createdAt: DateTime
- updatedAt: DateTime
```

### Promotion Model
```
- id: String (PK)
- productId: String (FK → Product)
- name: String
- description: String?
- discountType: String (PERCENTAGE, FIXED)
- discountValue: Float
- maxDiscount: Float?
- startDate: DateTime
- endDate: DateTime
- active: Boolean
- usageLimit: Int?
- usageCount: Int
- createdAt: DateTime
- updatedAt: DateTime
```

---

## 📡 Events

### Published Events

#### 1. PRODUCT_CREATED
Published when new product is created.

```json
{
  "type": "PRODUCT_CREATED",
  "aggregateId": "product-id",
  "data": {
    "productId": "clv...",
    "name": "Product Name",
    "sellerId": "user-id",
    "categoryId": "category-id",
    "price": 100,
    "stock": 50
  }
}
```

#### 2. PRODUCT_UPDATED
Published when product is updated.

#### 3. INVENTORY_RESERVED
Published when inventory is reserved for an order.

#### 4. INVENTORY_RESTORED
Published when inventory is restored (e.g., order cancelled).

#### 5. REVIEW_SUBMITTED
Published when review is submitted.

#### 6. PROMOTION_CREATED
Published when promotion is created.

### Subscribed Events

#### ORDER_CREATED (from Order Service)
Reserve inventory for items in order.

#### ORDER_CANCELLED (from Order Service)
Restore inventory for cancelled order items.

---

## 🎯 Discount Calculation

### Percentage Discount
```
discountAmount = price * (discountValue / 100)
finalPrice = price - min(discountAmount, maxDiscount)
```

### Fixed Discount
```
finalPrice = price - discountValue
```

---

## 📊 Product Status

| Status | Meaning |
|--------|---------|
| ACTIVE | Product is available for purchase |
| INACTIVE | Product is temporarily unavailable |
| DISCONTINUED | Product is no longer available |

---

## ⭐ Rating System

- Ratings are 1-5 stars
- Average rating is calculated from approved reviews
- Only approved reviews count toward rating
- Rating count tracks total review count

---

## 🧪 Testing Examples

### Create Product
```bash
curl -X POST http://localhost:3003/api/catalog/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Pro Laptop",
    "description": "High-performance laptop",
    "sku": "LAPTOP-001",
    "price": 1500,
    "costPrice": 1000,
    "stock": 50,
    "categoryId": "{categoryId}"
  }'
```

### List Products
```bash
curl -X GET "http://localhost:3003/api/catalog/products?categoryId={categoryId}&page=1&limit=20"
```

### Create Review
```bash
curl -X POST http://localhost:3003/api/catalog/products/{productId}/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "rating": 5,
    "title": "Excellent!",
    "comment": "This product is amazing!"
  }'
```

---

## 🔧 Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Lint code
npm run lint

# Run tests
npm run test

# Database operations
npm run db:migrate      # Create & apply migrations
npm run db:push         # Push schema without migrations
npm run db:reset        # Reset database (dev only)
npm run db:seed         # Seed demo data
```

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres-catalog

# Verify connection string in .env
cat .env | grep DATABASE_URL

# Try manual connection
psql -h localhost -p 5434 -U catalog_user -d catalog_db
```

### RabbitMQ Connection Failed

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check RabbitMQ logs
docker logs rabbitmq
```

### Inventory Not Updating

```bash
# Check event handlers are running
npm run dev

# Verify event is being published
# Check RabbitMQ queue at http://localhost:15672
```

---

## 📈 Performance

### Indexes
- `category.slug` - For slug lookups
- `product.sellerId` - For seller product queries
- `product.categoryId` - For category filtering
- `product.sku` - For SKU lookups
- `product.status` - For status filtering
- `review.productId` - For product reviews
- `review.userId` - For user reviews
- `promotion.productId` - For product promotions
- `promotion.active` - For active promotion filtering
- `promotion.startDate`, `promotion.endDate` - For date range queries

### Pagination
- Default limit: 20 items
- Maximum limit: 100 items
- Cursor-based or offset-based

---

## 🔗 Integration with Other Services

**Catalog Service integrates with:**
- **Auth Service** - User authentication
- **Order Service** - Receives ORDER_CREATED/ORDER_CANCELLED events
- **API Gateway (Traefik)** - Routes /api/catalog/* requests

---

## 📝 Validation Rules

### Category Validation
- name: 2+ characters
- slug: lowercase, numbers, hyphens only
- description: max 500 characters

### Product Validation
- name: 2+ characters
- description: 10+ characters
- sku: uppercase letters, numbers, hyphens
- price: positive number
- stock: non-negative integer

### Review Validation
- rating: 1-5
- title: 3-100 characters
- comment: 10-1000 characters

### Promotion Validation
- discountType: PERCENTAGE or FIXED
- discountValue: positive number
- startDate & endDate: valid ISO 8601 dates

---

## 📋 Available Commands

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

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
