# ⚡ Report Service - Quick API Reference

---

## 🚀 Quick Navigation

- [Setup](#setup)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [cURL Examples](#curl-examples)
- [Report Types](#report-types)
- [Status Codes](#status-codes)
- [Troubleshooting](#troubleshooting)

---

## Setup

### Start Service
```bash
cd Microservice/services/report-service
npm install
npm install file:../../shared
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### Environment
```
Port: 3007
Database: PostgreSQL on 5438
RabbitMQ: amqp://rabbitmq:5672
Auth: JWT in Authorization header
Base URL: http://localhost:3007
API Prefix: /api/reports
```

### Health Check
```bash
curl http://localhost:3007/health
# Response: {"status":"ok","service":"report-service","timestamp":"..."}
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
  http://localhost:3007/api/reports
```

---

## API Endpoints

### Summary Table

| Method | Endpoint | Auth | Admin | Purpose |
|--------|----------|------|-------|---------|
| POST | /api/reports/generate | ✅ | - | Generate report |
| GET | /api/reports | ✅ | - | List reports |
| GET | /api/reports/recent | ✅ | - | Recent reports |
| GET | /api/reports/:id | ✅ | - | Get report |
| GET | /api/reports/:id/metrics | ✅ | - | Get metrics |
| DELETE | /api/reports/:id | ✅ | ✅ | Delete report |

---

## cURL Examples

### 1. Generate Sales Report

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "April 2026 Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "filters": { "region": "all" },
    "description": "Monthly sales performance"
  }'
```

**Response (201):**
```json
{
  "message": "Report generated successfully",
  "report": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "April 2026 Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "totalRecords": 1250,
    "status": "COMPLETED",
    "createdBy": "admin-user-id",
    "createdAt": "2026-04-29T10:00:00Z",
    "metrics": [
      {
        "id": "metric-1",
        "metricName": "total_revenue",
        "value": "125000000",
        "unit": "VND"
      },
      {
        "id": "metric-2",
        "metricName": "order_count",
        "value": "1250",
        "unit": "count"
      }
    ]
  }
}
```

---

### 2. Generate Orders Report

```bash
curl -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Weekly Order Report",
    "type": "ORDERS",
    "period": "WEEKLY",
    "startDate": "2026-04-21T00:00:00Z",
    "endDate": "2026-04-27T23:59:59Z"
  }'
```

---

### 3. Generate Payments Report

```bash
curl -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Payment Analysis",
    "type": "PAYMENTS",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "description": "Payment success rates by gateway"
  }'
```

**Metrics included:**
- successful_payments (count)
- failed_payments (count)
- total_revenue (VND)

---

### 4. List All Reports

```bash
curl "http://localhost:3007/api/reports?skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Reports retrieved successfully",
  "reports": [
    {
      "id": "report-1",
      "name": "April Sales Report",
      "type": "SALES",
      "period": "MONTHLY",
      "totalRecords": 1250,
      "status": "COMPLETED",
      "createdAt": "2026-04-29T10:00:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "take": 10
}
```

---

### 5. List Reports with Filters

```bash
# Filter by type
curl "http://localhost:3007/api/reports?type=SALES&take=5" \
  -H "Authorization: Bearer $TOKEN"

# Filter by period
curl "http://localhost:3007/api/reports?period=MONTHLY&take=5" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl "http://localhost:3007/api/reports?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"

# Combined filters
curl "http://localhost:3007/api/reports?type=SALES&period=MONTHLY&skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `type` (optional) - SALES, ORDERS, USERS, PAYMENTS, INVENTORY, RETURNS, REVIEWS, CUSTOM
- `period` (optional) - DAILY, WEEKLY, MONTHLY, YEARLY, CUSTOM
- `startDate` (optional) - Filter by creation date (ISO8601)
- `endDate` (optional) - Filter by creation date (ISO8601)
- `skip` (optional, default=0) - Pagination offset
- `take` (optional, default=10, max=100) - Page size

---

### 6. Get Recent Reports

```bash
curl "http://localhost:3007/api/reports/recent?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Recent reports retrieved successfully",
  "reports": [ ... ],
  "count": 4
}
```

---

### 7. Get Specific Report

```bash
REPORT_ID="550e8400-e29b-41d4-a716-446655440000"

curl http://localhost:3007/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Report retrieved successfully",
  "report": {
    "id": "report-uuid",
    "name": "April 2026 Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "totalRecords": 1250,
    "status": "COMPLETED",
    "createdBy": "admin-user-id",
    "eventTypes": ["ORDER_CREATED", "PAYMENT_SUCCESS"],
    "dataSource": "events",
    "description": "Monthly sales performance",
    "filters": { "region": "all" },
    "metrics": [
      {
        "id": "metric-1",
        "metricName": "total_revenue",
        "value": "125000000",
        "unit": "VND"
      }
    ],
    "createdAt": "2026-04-29T10:00:00Z",
    "updatedAt": "2026-04-29T10:00:00Z"
  }
}
```

---

### 8. Get Report Metrics

```bash
curl http://localhost:3007/api/reports/$REPORT_ID/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "message": "Metrics retrieved successfully",
  "reportId": "report-uuid",
  "metrics": [
    {
      "id": "metric-1",
      "reportId": "report-uuid",
      "metricName": "total_revenue",
      "value": "125000000",
      "unit": "VND",
      "metadata": { "currency": "VND", "region": "all" },
      "createdAt": "2026-04-29T10:00:00Z"
    },
    {
      "id": "metric-2",
      "reportId": "report-uuid",
      "metricName": "order_count",
      "value": "1250",
      "unit": "count",
      "metadata": { "status": "completed" },
      "createdAt": "2026-04-29T10:00:00Z"
    },
    {
      "id": "metric-3",
      "reportId": "report-uuid",
      "metricName": "avg_order_value",
      "value": "100000",
      "unit": "VND",
      "metadata": { "calculation": "total_revenue / order_count" },
      "createdAt": "2026-04-29T10:00:00Z"
    }
  ],
  "count": 3
}
```

---

### 9. Delete Report (Admin Only)

```bash
ADMIN_TOKEN="admin-token-here"

curl -X DELETE http://localhost:3007/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "message": "Report deleted successfully",
  "report": {
    "id": "report-uuid",
    "name": "April 2026 Sales Report",
    "deletedAt": "2026-04-29T10:05:00Z"
  }
}
```

---

## Report Types

### SALES
- **Metrics**: total_revenue, order_count, avg_order_value
- **Events**: ORDER_CREATED, PAYMENT_SUCCESS
- **Use Case**: Revenue analysis, sales trends

### ORDERS
- **Metrics**: total_orders, avg_order_value
- **Events**: ORDER_CREATED, ORDER_COMPLETED, ORDER_CANCELLED
- **Use Case**: Order volume analysis

### USERS
- **Metrics**: new_users
- **Events**: USER_REGISTERED, USER_UPDATED
- **Use Case**: User growth tracking

### PAYMENTS
- **Metrics**: successful_payments, failed_payments, total_revenue
- **Events**: PAYMENT_SUCCESS, PAYMENT_FAILED, REFUND_COMPLETED
- **Use Case**: Payment gateway performance

### INVENTORY
- **Metrics**: stock_levels, product_movement
- **Events**: PRODUCT_UPDATED, INVENTORY_ADJUSTED
- **Use Case**: Stock level tracking

### RETURNS
- **Metrics**: returns_initiated, returns_completed
- **Events**: RETURN_CREATED, RETURN_COMPLETED
- **Use Case**: Return rate analysis

### REVIEWS
- **Metrics**: review_count, avg_rating
- **Events**: REVIEW_SUBMITTED, REVIEW_UPDATED
- **Use Case**: Product feedback analysis

### CUSTOM
- **Metrics**: total_events, event_types breakdown
- **Events**: All events (user-defined filtering)
- **Use Case**: Custom analysis

---

## Status Codes

### Success (2xx)

| Code | Scenario |
|------|----------|
| 200 | GET, DELETE success |
| 201 | POST create success |

### Client Error (4xx)

| Code | When |
|------|------|
| 400 | Invalid request (dates, type) |
| 401 | Missing/invalid token |
| 403 | Admin-only endpoint |
| 404 | Report not found |
| 422 | Validation failed |

### Server Error (5xx)

| Code | When |
|------|------|
| 500 | Server error |
| 503 | Database/RabbitMQ down |

---

## Troubleshooting

### 1. "Invalid token" (401)

```bash
# Check token format
# Should be: Authorization: Bearer <token>

# Get new token
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"Pass123"}'
```

---

### 2. "Validation failed" (422)

**Problem**: Invalid input data

**Solution**: Check field requirements:
- `name`: 3-255 characters
- `type`: One of 8 valid types
- `period`: One of 5 valid periods
- `startDate`: ISO8601 format, not future
- `endDate`: After startDate, not future

**Example fix:**
```bash
# WRONG: Date in future
"startDate": "2030-01-01T00:00:00Z"

# RIGHT: Date in past
"startDate": "2026-04-01T00:00:00Z"
```

---

### 3. "Report not found" (404)

```bash
# Check if report exists
curl http://localhost:3007/api/reports \
  -H "Authorization: Bearer $TOKEN" | jq '.reports[].id'

# Or use valid UUID from previous response
```

---

### 4. "Admin role required" (403)

**Problem**: Non-admin trying DELETE

**Solution**: Only admins can delete reports
```bash
# Use admin account instead
curl -X DELETE http://localhost:3007/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 5. "Database connection failed" (503)

```bash
# Check PostgreSQL
psql -U report_user -d report_db -h localhost -p 5438

# Start with docker-compose
docker-compose up report-postgres

# Or manually
docker run -d \
  --name report-postgres \
  -e POSTGRES_USER=report_user \
  -e POSTGRES_PASSWORD=report_pass \
  -e POSTGRES_DB=report_db \
  -p 5438:5432 \
  postgres:15
```

---

### 6. "RabbitMQ connection error" (503)

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

## Workflows

### Workflow 1: Generate Monthly Sales Report

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "email": "user@example.com",
    "password": "SecurePassword123"
  }' | jq -r '.token')

# 2. Generate report for April
REPORT=$(curl -s -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "April 2026 Sales",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z"
  }')

REPORT_ID=$(echo $REPORT | jq -r '.report.id')

# 3. Get detailed metrics
curl http://localhost:3007/api/reports/$REPORT_ID/metrics \
  -H "Authorization: Bearer $TOKEN" | jq '.metrics'

# Output:
# [
#   { "metricName": "total_revenue", "value": "125000000", "unit": "VND" },
#   { "metricName": "order_count", "value": "1250", "unit": "count" },
#   { "metricName": "avg_order_value", "value": "100000", "unit": "VND" }
# ]
```

---

### Workflow 2: Compare Multiple Report Types

```bash
# Generate Sales report
SALES=$(curl -s -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sales","type":"SALES","period":"MONTHLY",...}' | jq -r '.report.id')

# Generate Orders report
ORDERS=$(curl -s -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Orders","type":"ORDERS","period":"MONTHLY",...}' | jq -r '.report.id')

# Generate Payments report
PAYMENTS=$(curl -s -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Payments","type":"PAYMENTS","period":"MONTHLY",...}' | jq -r '.report.id')

# List all SALES reports
curl "http://localhost:3007/api/reports?type=SALES&take=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Workflow 3: Cleanup Old Reports (Admin)

```bash
# Get reports older than date
curl "http://localhost:3007/api/reports?endDate=2026-03-31T23:59:59Z" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.reports[].id'

# Delete each old report
ADMIN_TOKEN="admin-token"
curl -X DELETE http://localhost:3007/api/reports/{reportId} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
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

**4 Reports:**
1. April 2026 Sales Report (SALES, MONTHLY) - $125M revenue, 1,250 orders
2. Order Performance - Week 17 (ORDERS, WEEKLY) - 287 orders
3. Payment Gateway Analysis (PAYMENTS, MONTHLY) - 1,200 successful
4. User Growth Report (USERS, MONTHLY) - 523 new users

**10 Metrics** across all reports

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Report Service on Port 3007
