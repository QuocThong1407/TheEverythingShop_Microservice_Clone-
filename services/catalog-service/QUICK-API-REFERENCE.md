# ⚡ Catalog Service - Quick API Reference

**Service Port**: 3003  
**Base URL**: `http://localhost:3003/api/catalog`  
**Authentication**: Bearer token in `Authorization` header (optional for GET, required for mutations)

---

## 📋 Endpoints Overview

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/categories` | ✅ | Create category |
| GET | `/categories` | ❌ | List categories |
| GET | `/categories/:id` | ❌ | Get category |
| PUT | `/categories/:id` | ✅ | Update category |
| POST | `/products` | ✅ | Create product |
| GET | `/products` | ❌ | List products |
| GET | `/products/:id` | ❌ | Get product |
| PUT | `/products/:id` | ✅ | Update product |
| POST | `/products/:id/reviews` | ✅ | Create review |
| GET | `/products/:id/reviews` | ❌ | Get reviews |
| GET | `/reviews/:id` | ❌ | Get review |
| DELETE | `/reviews/:id` | ✅ | Delete review |
| POST | `/products/:id/promotions` | ✅ | Create promotion |
| GET | `/products/:id/promotions` | ❌ | Get promotions |
| GET | `/promotions/:id` | ❌ | Get promotion |
| PUT | `/promotions/:id` | ✅ | Update promotion |

---

## 🔐 Authentication

All endpoints requiring authentication need:

```bash
Authorization: Bearer {accessToken}
```

---

## 📂 Category Endpoints

### 1. POST `/categories` (Admin)

Create new category.

```bash
curl -X POST http://localhost:3003/api/catalog/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices"
  }'
```

**Response (201)**
```json
{
  "message": "Category created successfully",
  "category": {
    "id": "clv...",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices",
    "image": null,
    "createdAt": "2026-04-29T10:30:00Z",
    "updatedAt": "2026-04-29T10:30:00Z"
  }
}
```

---

### 2. GET `/categories`

List all categories.

```bash
curl http://localhost:3003/api/catalog/categories
```

**Response (200)**
```json
{
  "message": "Categories retrieved successfully",
  "categories": [...]
}
```

---

### 3. GET `/categories/:categoryId`

Get category by ID.

---

### 4. PUT `/categories/:categoryId` (Admin)

Update category.

---

## 📦 Product Endpoints

### 5. POST `/products` (Seller)

Create product.

```bash
curl -X POST http://localhost:3003/api/catalog/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Pro Laptop",
    "description": "High-performance laptop for professionals",
    "sku": "LAPTOP-001",
    "price": 1500,
    "costPrice": 1000,
    "stock": 50,
    "categoryId": "clv..."
  }'
```

**Response (201)**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "clv...",
    "name": "Pro Laptop",
    "sku": "LAPTOP-001",
    "price": 1500,
    "stock": 50,
    "status": "ACTIVE",
    "sellerId": "user-id",
    "categoryId": "clv...",
    "rating": 0,
    "ratingCount": 0,
    "reviewCount": 0,
    "createdAt": "2026-04-29T10:30:00Z",
    "updatedAt": "2026-04-29T10:30:00Z"
  }
}
```

---

### 6. GET `/products`

List products with pagination and filtering.

```bash
curl "http://localhost:3003/api/catalog/products?categoryId=clv...&page=1&limit=20&sort=price"
```

**Query Parameters:**
- `categoryId`: Filter by category
- `sellerId`: Filter by seller
- `status`: ACTIVE, INACTIVE, DISCONTINUED
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: name, price, rating, createdAt

**Response (200)**
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

### 7. GET `/products/:productId`

Get product by ID.

```bash
curl http://localhost:3003/api/catalog/products/{productId}
```

---

### 8. PUT `/products/:productId` (Seller)

Update product.

```bash
curl -X PUT http://localhost:3003/api/catalog/products/{productId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "price": 1400,
    "stock": 45,
    "name": "Updated Laptop"
  }'
```

---

## ⭐ Review Endpoints

### 9. POST `/products/:productId/reviews` (Authenticated)

Create review.

```bash
curl -X POST http://localhost:3003/api/catalog/products/{productId}/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "rating": 5,
    "title": "Excellent product!",
    "comment": "This product exceeded my expectations. Highly recommended for everyone!"
  }'
```

**Validation:**
- `rating`: 1-5 (required)
- `title`: 3-100 characters (required)
- `comment`: 10-1000 characters (required)

**Response (201)**
```json
{
  "message": "Review created successfully",
  "review": {
    "id": "clv...",
    "productId": "clv...",
    "userId": "user-id",
    "rating": 5,
    "title": "Excellent product!",
    "comment": "...",
    "helpful": 0,
    "status": "PENDING",
    "createdAt": "2026-04-29T10:30:00Z",
    "updatedAt": "2026-04-29T10:30:00Z"
  }
}
```

---

### 10. GET `/products/:productId/reviews`

Get product reviews (approved only).

```bash
curl http://localhost:3003/api/catalog/products/{productId}/reviews
```

**Response (200)**
```json
{
  "message": "Reviews retrieved successfully",
  "reviews": [...],
  "count": 5
}
```

---

### 11. GET `/reviews/:reviewId`

Get review by ID.

---

### 12. DELETE `/reviews/:reviewId` (Review Author)

Delete review.

```bash
curl -X DELETE http://localhost:3003/api/catalog/reviews/{reviewId} \
  -H "Authorization: Bearer {token}"
```

---

## 🎁 Promotion Endpoints

### 13. POST `/products/:productId/promotions` (Seller)

Create promotion.

```bash
curl -X POST http://localhost:3003/api/catalog/products/{productId}/promotions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Summer Sale",
    "description": "20% off all items",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxDiscount": 300,
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-05-31T23:59:59Z",
    "usageLimit": 1000
  }'
```

**Discount Types:**
- `PERCENTAGE`: discountValue is percentage
- `FIXED`: discountValue is fixed amount

**Response (201)**
```json
{
  "message": "Promotion created successfully",
  "promotion": {
    "id": "clv...",
    "productId": "clv...",
    "name": "Summer Sale",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxDiscount": 300,
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-05-31T23:59:59Z",
    "active": true,
    "usageCount": 0
  }
}
```

---

### 14. GET `/products/:productId/promotions`

Get active promotions for product.

---

### 15. GET `/promotions/:promotionId`

Get promotion by ID.

---

### 16. PUT `/promotions/:promotionId` (Seller)

Update promotion.

```bash
curl -X PUT http://localhost:3003/api/catalog/promotions/{promotionId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "discountValue": 25,
    "active": false
  }'
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "rating",
      "message": "Rating must be between 1 and 5"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "message": "You do not have permission to update this product",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Product not found",
  "statusCode": 404
}
```

### 409 Conflict
```json
{
  "message": "Product with this SKU already exists",
  "statusCode": 409
}
```

---

## 🔄 Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## 🎯 Product Status

```
ACTIVE         → Available for purchase
INACTIVE       → Temporarily unavailable
DISCONTINUED   → No longer available
```

---

## ⭐ Review Status

```
PENDING   → Awaiting approval
APPROVED  → Visible and counts toward rating
REJECTED  → Hidden, doesn't count
```

---

## 💰 Discount Calculation

**Percentage:**
```
discountAmount = price * (discountValue / 100)
finalPrice = price - min(discountAmount, maxDiscount)
```

**Fixed:**
```
finalPrice = price - discountValue
```

---

## 📊 Sorting Options

```
sort=name      → Sort by product name
sort=price     → Sort by price (ascending)
sort=rating    → Sort by rating (descending)
sort=createdAt → Sort by creation date (newest first)
```

---

## 🧪 Full Workflow Example

```bash
# 1. Get categories
curl http://localhost:3003/api/catalog/categories

# 2. Create product (as seller)
CATEGORY_ID="clv..."
curl -X POST http://localhost:3003/api/catalog/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Pro Laptop",
    "description": "High-performance laptop",
    "sku": "LAPTOP-001",
    "price": 1500,
    "stock": 50,
    "categoryId": "'$CATEGORY_ID'"
  }'

# 3. Get product
PRODUCT_ID="clv..."
curl http://localhost:3003/api/catalog/products/$PRODUCT_ID

# 4. Create review (as customer)
curl -X POST http://localhost:3003/api/catalog/products/$PRODUCT_ID/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "rating": 5,
    "title": "Great!",
    "comment": "This product is amazing and works great!"
  }'

# 5. Create promotion (as seller)
curl -X POST http://localhost:3003/api/catalog/products/$PRODUCT_ID/promotions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Summer Sale",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-05-31T23:59:59Z"
  }'

# 6. Get promotions
curl http://localhost:3003/api/catalog/products/$PRODUCT_ID/promotions
```

---

## 📚 Postman Collection

Import into Postman to test all endpoints.

```json
{
  "info": {
    "name": "Catalog Service",
    "description": "16 catalog management endpoints"
  }
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Catalog Service (Port 3003)
