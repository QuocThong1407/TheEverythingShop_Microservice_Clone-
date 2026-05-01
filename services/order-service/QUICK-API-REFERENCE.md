# ⚡ Order Service - Quick API Reference

**Service Port**: 3005  
**Base URL**: `http://localhost:3005/api/orders`  
**Authentication**: Bearer token in `Authorization` header (required for all endpoints)

---

## 📋 Endpoints Overview

| Method | Endpoint | Purpose | Role |
|--------|----------|---------|------|
| POST | `/` | Create order | User |
| GET | `/` | List user orders | User |
| GET | `/:id` | Get order by ID | User |
| PATCH | `/:id/confirm` | Confirm order | User |
| PATCH | `/:id/ship` | Ship order | Admin |
| PATCH | `/:id/deliver` | Deliver order | Admin |
| PATCH | `/:id/cancel` | Cancel order | User |
| GET | `/:userId/stats` | Get order stats | User |
| POST | `/:id/returns` | Request return | User |
| GET | `/:id/returns` | Get order returns | User |
| GET | `/returns/:id` | Get return by ID | User |
| PATCH | `/returns/:id/approve` | Approve return | Admin |
| PATCH | `/returns/:id/complete` | Complete return | Admin |

---

## 🔐 Authentication

All endpoints require:

```bash
Authorization: Bearer {accessToken}
```

---

## 📦 Order Endpoints

### 1. POST `/`

Create new order.

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
      },
      {
        "productId": "prod-002",
        "productName": "T-Shirt",
        "productSku": "TSHIRT-001",
        "quantity": 3,
        "unitPrice": 75,
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
    "notes": "Handle with care"
  }'
```

**Response (201)**
```json
{
  "message": "Order created successfully",
  "order": {
    "id": "clv...",
    "orderNumber": "ORD-...",
    "userId": "user-id",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "subtotal": 1725,
    "shippingCost": 50,
    "tax": 142,
    "total": 1917,
    "items": [...],
    "createdAt": "2026-04-29T10:30:00Z"
  }
}
```

---

### 2. GET `/`

List user orders with pagination.

```bash
curl -X GET "http://localhost:3005/api/orders?status=CONFIRMED&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

**Query Parameters:**
- `status`: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200)**
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

### 3. GET `/:orderId`

Get specific order.

```bash
curl http://localhost:3005/api/orders/{orderId} \
  -H "Authorization: Bearer {token}"
```

**Response (200)**
```json
{
  "message": "Order retrieved successfully",
  "order": {...}
}
```

---

### 4. PATCH `/:orderId/confirm`

Confirm order (PENDING → CONFIRMED).

```bash
curl -X PATCH http://localhost:3005/api/orders/{orderId}/confirm \
  -H "Authorization: Bearer {token}"
```

**Response (200)**
```json
{
  "message": "Order confirmed successfully",
  "order": {
    "status": "CONFIRMED",
    ...
  }
}
```

---

### 5. PATCH `/:orderId/ship` (Admin)

Ship order (CONFIRMED → SHIPPED).

```bash
curl -X PATCH http://localhost:3005/api/orders/{orderId}/ship \
  -H "Authorization: Bearer {admin_token}"
```

---

### 6. PATCH `/:orderId/deliver` (Admin)

Deliver order (SHIPPED → DELIVERED).

```bash
curl -X PATCH http://localhost:3005/api/orders/{orderId}/deliver \
  -H "Authorization: Bearer {admin_token}"
```

---

### 7. PATCH `/:orderId/cancel`

Cancel order.

```bash
curl -X PATCH http://localhost:3005/api/orders/{orderId}/cancel \
  -H "Authorization: Bearer {token}"
```

**Response (200)**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "status": "CANCELLED",
    ...
  }
}
```

---

### 8. GET `/:userId/stats`

Get order statistics.

```bash
curl http://localhost:3005/api/orders/{userId}/stats \
  -H "Authorization: Bearer {token}"
```

**Response (200)**
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

## 🔄 Return Endpoints

### 9. POST `/:orderId/returns`

Request return.

```bash
curl -X POST http://localhost:3005/api/orders/{orderId}/returns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "items": ["prod-001", "prod-002"],
    "reason": "Product quality not as expected. One item was damaged."
  }'
```

**Response (201)**
```json
{
  "message": "Return requested successfully",
  "return": {
    "id": "clv...",
    "returnNumber": "RET-...",
    "orderId": "clv...",
    "items": ["prod-001", "prod-002"],
    "reason": "Product quality not as expected...",
    "status": "PENDING",
    "refundAmount": 1500,
    "createdAt": "2026-04-29T10:30:00Z"
  }
}
```

---

### 10. GET `/:orderId/returns`

Get order returns.

```bash
curl http://localhost:3005/api/orders/{orderId}/returns \
  -H "Authorization: Bearer {token}"
```

**Response (200)**
```json
{
  "message": "Returns retrieved successfully",
  "returns": [...]
}
```

---

### 11. GET `/returns/:returnId`

Get return by ID.

```bash
curl http://localhost:3005/api/orders/returns/{returnId} \
  -H "Authorization: Bearer {token}"
```

---

### 12. PATCH `/returns/:returnId/approve` (Admin)

Approve return.

```bash
curl -X PATCH http://localhost:3005/api/orders/returns/{returnId}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "refundAmount": 1500,
    "notes": "Return approved and will be processed"
  }'
```

**Response (200)**
```json
{
  "message": "Return approved successfully",
  "return": {
    "status": "APPROVED",
    "refundAmount": 1500,
    ...
  }
}
```

---

### 13. PATCH `/returns/:returnId/complete` (Admin)

Complete return.

```bash
curl -X PATCH http://localhost:3005/api/orders/returns/{returnId}/complete \
  -H "Authorization: Bearer {admin_token}"
```

**Response (200)**
```json
{
  "message": "Return completed successfully",
  "return": {
    "status": "COMPLETED",
    ...
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "statusCode": 400,
  "errors": [
    {
      "field": "items",
      "message": "Order must have at least 1 item"
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
  "message": "You do not have permission to view this order",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Order not found",
  "statusCode": 404
}
```

### 500 Server Error
```json
{
  "message": "Failed to create order",
  "statusCode": 500
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
| 500 | Server Error |

---

## 📊 Order Status Flow

```
PENDING
  ↓ (confirm)
CONFIRMED
  ↓ (ship)
SHIPPED
  ↓ (deliver)
DELIVERED
  ↓ (request return)
RETURN_REQUESTED

CANCELLED (from any status)
```

---

## 💰 Pricing Calculation

```
Item Subtotal = (Unit Price - Discount) × Quantity
Order Subtotal = Sum of all item subtotals
Order Total = Subtotal + Shipping Cost + Tax

Example:
  Item 1: (1500 - 0) × 1 = 1500
  Item 2: (75 - 0) × 3 = 225
  Subtotal: 1725
  
  Total = 1725 + 50 + 142 = 1917
```

---

## 🧪 Complete Workflow Example

```bash
# 1. Create order
curl -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{...order_data...}'
# Returns: orderId

# 2. Get order
curl http://localhost:3005/api/orders/{orderId} \
  -H "Authorization: Bearer {token}"

# 3. Confirm order
curl -X PATCH http://localhost:3005/api/orders/{orderId}/confirm \
  -H "Authorization: Bearer {token}"

# 4. (Admin) Ship order
curl -X PATCH http://localhost:3005/api/orders/{orderId}/ship \
  -H "Authorization: Bearer {admin_token}"

# 5. (Admin) Deliver order
curl -X PATCH http://localhost:3005/api/orders/{orderId}/deliver \
  -H "Authorization: Bearer {admin_token}"

# 6. Request return
curl -X POST http://localhost:3005/api/orders/{orderId}/returns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "items": ["prod-001"],
    "reason": "Not as described"
  }'
# Returns: returnId

# 7. (Admin) Approve return
curl -X PATCH http://localhost:3005/api/orders/returns/{returnId}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "refundAmount": 1500
  }'

# 8. (Admin) Complete return
curl -X PATCH http://localhost:3005/api/orders/returns/{returnId}/complete \
  -H "Authorization: Bearer {admin_token}"
```

---

## 📚 Request/Response Examples

### Create Order Request
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
  "tax": 142
}
```

### Order Response
```json
{
  "id": "clv1234567890abc",
  "orderNumber": "ORD-1714408200000-1234",
  "userId": "user-123",
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "subtotal": 1500,
  "shippingCost": 50,
  "tax": 142,
  "total": 1692,
  "items": [
    {
      "id": "clv...",
      "productId": "prod-001",
      "productName": "Pro Laptop",
      "productSku": "LAPTOP-001",
      "quantity": 1,
      "unitPrice": 1500,
      "discount": 0,
      "subtotal": 1500
    }
  ],
  "createdAt": "2026-04-29T10:30:00Z",
  "updatedAt": "2026-04-29T10:30:00Z"
}
```

### Return Request Response
```json
{
  "id": "clv9876543210xyz",
  "returnNumber": "RET-1714408500000-1111",
  "orderId": "clv1234567890abc",
  "items": ["prod-001"],
  "reason": "Product not working properly",
  "status": "PENDING",
  "refundAmount": 1500,
  "createdAt": "2026-04-29T10:35:00Z"
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Order Service (Port 3005)
