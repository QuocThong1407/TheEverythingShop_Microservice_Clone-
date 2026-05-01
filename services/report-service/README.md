# 📊 Report Service

**Analytics & Reporting Aggregation Service**

Port: `3007` | Database: `PostgreSQL` | Broker: `RabbitMQ`

---

## 📖 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Event Aggregation](#event-aggregation)
- [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [Events Published](#events-published)
- [Demo Data](#demo-data)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **Report Service** is a specialized microservice that aggregates data from all other services through event-driven architecture. It provides:

- **Real-time Analytics**: Subscribes to all system events for live aggregation
- **Report Generation**: Creates custom reports (Sales, Orders, Payments, Users, etc.)
- **Metrics Calculation**: Automatically calculates metrics like revenue, order counts, success rates
- **Historical Analysis**: Stores reports and metrics for trend analysis
- **Multi-source Aggregation**: Combines data from Order, Payment, User, Review, and Return events

### Key Features

✅ **Event-Driven Architecture** - Subscribes to 8+ event patterns in real-time  
✅ **Multiple Report Types** - Sales, Orders, Users, Payments, Inventory, Returns, Reviews, Custom  
✅ **Time Period Flexibility** - Daily, Weekly, Monthly, Yearly, Custom ranges  
✅ **Metric Aggregation** - Revenue, counts, averages, success rates  
✅ **Admin Controls** - Only admins can delete reports  
✅ **Full CRUD** - Create, list, retrieve, update metrics  

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15
- RabbitMQ 3.12
- npm 9+

### Installation

```bash
cd Microservice/services/report-service

# Install dependencies
npm install
npm install file:../../shared

# Setup database
npm run prisma:migrate

# Seed demo data
npm run prisma:seed
```

### Start Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Running on port 3007
curl http://localhost:3007/health
# Response: {"status":"ok","service":"report-service","timestamp":"..."}
```

### Environment Configuration

Create `.env` file:

```env
PORT=3007
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://report_user:report_pass@localhost:5438/report_db

# JWT
JWT_SECRET=your-secret-key-here

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

---

## Architecture

### Service Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Report Service (3007)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │            RabbitMQ Event Subscription                 │   │
│  │  Patterns: user.*, order.*, payment.*, etc.            │   │
│  │  Real-time aggregation of all system events            │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ↓                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           Report Service Layer                         │   │
│  │  - Aggregate event data                                │   │
│  │  - Calculate metrics                                   │   │
│  │  - Generate reports                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ↓                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           Repository Layer (CRUD)                      │   │
│  │  ReportRepository  → Report model                      │   │
│  │  MetricRepository  → Metric model                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ↓                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │            PostgreSQL Database                         │   │
│  │  report_db (Port 5438)                                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Event Flow: Auth/Account/Catalog/Order/Payment/Cart Services
            ↓
        RabbitMQ Topics
            ↓
    Report Service Subscriptions (8 patterns)
            ↓
    Event Aggregation & Metrics Calculation
            ↓
    Database Storage
            ↓
    HTTP API Endpoints
```

### Layered Architecture

```
HTTP Endpoints (Controllers)
         ↓
Routes & Validation
         ↓
Service Layer (Business Logic)
         ↓
Repository Layer (Database CRUD)
         ↓
Prisma ORM
         ↓
PostgreSQL Database
```

---

## API Endpoints

### Summary

| Method | Endpoint | Auth | Admin | Purpose |
|--------|----------|------|-------|---------|
| POST | /api/reports/generate | ✅ | - | Generate report |
| GET | /api/reports | ✅ | - | List all reports |
| GET | /api/reports/recent | ✅ | - | Get recent reports |
| GET | /api/reports/:reportId | ✅ | - | Get specific report |
| GET | /api/reports/:reportId/metrics | ✅ | - | Get report metrics |
| DELETE | /api/reports/:reportId | ✅ | ✅ | Delete report |

---

### 1. Generate Report

```http
POST /api/reports/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "April Sales Report",
  "type": "SALES",
  "period": "MONTHLY",
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-30T23:59:59Z",
  "filters": { "region": "all" },
  "description": "Monthly sales performance"
}
```

**Response (201):**
```json
{
  "message": "Report generated successfully",
  "report": {
    "id": "report-uuid",
    "name": "April Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "totalRecords": 1250,
    "status": "COMPLETED",
    "createdBy": "user-uuid",
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

**Report Types:**
- `SALES` - Revenue, order value metrics
- `ORDERS` - Order counts, fulfillment metrics
- `USERS` - User registrations, activity
- `PAYMENTS` - Payment success rates, gateway analysis
- `INVENTORY` - Stock levels, product movement
- `RETURNS` - Return rates and reasons
- `REVIEWS` - Review counts and ratings
- `CUSTOM` - User-defined custom reports

**Period Types:**
- `DAILY` - Single day metrics
- `WEEKLY` - 7-day period
- `MONTHLY` - Calendar month
- `YEARLY` - Calendar year
- `CUSTOM` - Arbitrary date range

---

### 2. List Reports

```http
GET /api/reports?type=SALES&period=MONTHLY&skip=0&take=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional) - Report type filter
- `period` (optional) - Period filter
- `startDate` (optional) - Filter by creation date (ISO8601)
- `endDate` (optional) - Filter by creation date (ISO8601)
- `skip` (optional, default=0) - Pagination offset
- `take` (optional, default=10) - Page size (max 100)

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

### 3. Get Recent Reports

```http
GET /api/reports/recent?limit=10
Authorization: Bearer <token>
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

### 4. Get Specific Report

```http
GET /api/reports/{reportId}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Report retrieved successfully",
  "report": {
    "id": "report-uuid",
    "name": "April Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-30T23:59:59Z",
    "totalRecords": 1250,
    "status": "COMPLETED",
    "createdBy": "user-uuid",
    "eventTypes": ["ORDER_CREATED", "PAYMENT_SUCCESS"],
    "dataSource": "events",
    "description": "Monthly sales performance",
    "filters": { "region": "all" },
    "metrics": [ ... ],
    "createdAt": "2026-04-29T10:00:00Z",
    "updatedAt": "2026-04-29T10:00:00Z"
  }
}
```

---

### 5. Get Report Metrics

```http
GET /api/reports/{reportId}/metrics
Authorization: Bearer <token>
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

### 6. Delete Report (Admin)

```http
DELETE /api/reports/{reportId}
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "message": "Report deleted successfully",
  "report": {
    "id": "report-uuid",
    "name": "April Sales Report",
    "deletedAt": "2026-04-29T10:05:00Z"
  }
}
```

---

## Event Aggregation

### Subscribed Events

The Report Service subscribes to these event patterns from all services:

```typescript
const patterns = [
  'user.*',           // USER_REGISTERED, USER_UPDATED
  'order.*',          // ORDER_CREATED, ORDER_COMPLETED, ORDER_CANCELLED
  'payment.*',        // PAYMENT_SUCCESS, PAYMENT_FAILED, REFUND_COMPLETED
  'cart.*',           // CART_CREATED, CART_CHECKED_OUT
  'product.*',        // PRODUCT_UPDATED, PRODUCT_DELETED
  'review.*',         // REVIEW_SUBMITTED, REVIEW_UPDATED
  'return.*',         // RETURN_CREATED, RETURN_COMPLETED
  'promotion.*',      // PROMOTION_CREATED, PROMOTION_APPLIED
]
```

### Event Processing

```typescript
// When event arrives:
1. Extract event data
2. Aggregate by type and date
3. Calculate metrics
4. Store in memory (last 1000 events)
5. Update database if report exists

// Metrics calculated from events:
- Order events    → order_count, total_order_value, avg_order_value
- Payment events  → payment_success, payment_failed, total_revenue
- User events     → new_users_count
- Review events   → review_count, avg_rating
- Return events   → returns_initiated, returns_completed
```

### Memory-Efficient Design

- Aggregates events in real-time
- Keeps last 1000 events in memory for fast access
- Older events queried from database
- Reduces database load through intelligent caching

---

## Database Schema

### Report Model

```prisma
model Report {
  id          String    @id @default(uuid())
  name        String    @db.VarChar(255)       // Report name
  type        ReportType                       // SALES, ORDERS, USERS, etc.
  period      ReportPeriod                     // DAILY, WEEKLY, MONTHLY, etc.
  
  startDate   DateTime                         // Report period start
  endDate     DateTime                         // Report period end
  
  dataSource  String    @default("events")     // Source of data
  eventTypes  String[]  @default([])           // Which events were aggregated
  totalRecords Int     @default(0)             // Count of records aggregated
  
  metrics     Metric[]                         // Related metrics
  filters     Json?                            // Optional query filters
  
  createdBy   String    @db.Uuid              // Admin/system who created
  status      ReportStatus @default(COMPLETED)
  description String?   @db.VarChar(500)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([type])
  @@index([period])
  @@index([createdAt])
  @@index([createdBy])
}

enum ReportType {
  SALES, ORDERS, USERS, PAYMENTS, INVENTORY, RETURNS, REVIEWS, CUSTOM
}

enum ReportPeriod {
  DAILY, WEEKLY, MONTHLY, YEARLY, CUSTOM
}

enum ReportStatus {
  PENDING, COMPLETED, FAILED, ARCHIVED
}
```

### Metric Model

```prisma
model Metric {
  id         String   @id @default(uuid())
  reportId   String   @db.Uuid
  report     Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  
  metricName String   @db.VarChar(100)    // e.g., "total_revenue"
  value      Decimal  @db.Decimal(15, 2)  // Numeric value
  unit       String   @db.VarChar(50)     // VND, count, percentage, etc.
  
  metadata   Json?    // Breakdown, comparisons, etc.
  
  createdAt  DateTime @default(now())
  
  @@index([reportId])
  @@index([metricName])
}
```

---

## Tech Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18 LTS Alpine | JavaScript runtime |
| **TypeScript** | 5.3.3 | Type safety |
| **Express.js** | 5.x | HTTP framework |
| **Prisma** | 5.7.1 | ORM & migrations |
| **PostgreSQL** | 15 | Database |
| **RabbitMQ** | 3.12 | Message broker |
| **pino** | 8.16.2 | Logging |
| **express-validator** | 7.0.0 | Input validation |

---

## Events Published

The Report Service **listens to** but **does not publish** events. It's a pure aggregation service.

**Consumed Events** (from other services):
- `ORDER_CREATED` - For sales & order metrics
- `PAYMENT_SUCCESS` / `PAYMENT_FAILED` - For payment metrics
- `USER_REGISTERED` - For user metrics
- `REVIEW_SUBMITTED` - For review metrics
- `RETURN_CREATED` / `RETURN_COMPLETED` - For return metrics

---

## Demo Data

After running `npm run prisma:seed`, the database includes:

### Reports Created:
1. **April 2026 Sales Report** (SALES, MONTHLY)
   - Total Revenue: 125,000,000 VND
   - Order Count: 1,250
   - Avg Order Value: 100,000 VND

2. **Order Performance - Week 17** (ORDERS, WEEKLY)
   - Total Orders: 287
   - Avg Order Value: 95,000 VND

3. **Payment Gateway Analysis** (PAYMENTS, MONTHLY)
   - Successful Payments: 1,200
   - Failed Payments: 50
   - Total Revenue: 125,000,000 VND

4. **User Growth Report** (USERS, MONTHLY)
   - New Users: 523

### Total:
- 4 Reports
- 10 Metrics

---

## Workflow Examples

### Example 1: Generate Sales Report

```bash
# 1. Generate report
curl -X POST http://localhost:3007/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Q2 Sales Report",
    "type": "SALES",
    "period": "MONTHLY",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-06-30T23:59:59Z",
    "description": "Q2 2026 sales performance"
  }'

# 2. Get report with metrics
curl http://localhost:3007/api/reports/{reportId} \
  -H "Authorization: Bearer $TOKEN"

# 3. View metrics breakdown
curl http://localhost:3007/api/reports/{reportId}/metrics \
  -H "Authorization: Bearer $TOKEN"
```

### Example 2: List Reports with Filters

```bash
# Get all SALES reports from MONTHLY period
curl "http://localhost:3007/api/reports?type=SALES&period=MONTHLY&skip=0&take=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3: Admin Cleanup (Delete Old Reports)

```bash
# Delete specific report
curl -X DELETE http://localhost:3007/api/reports/{reportId} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Error Handling

### Status Codes

| Code | Scenario |
|------|----------|
| 200 | Success (GET, DELETE) |
| 201 | Created (POST) |
| 400 | Bad request (validation failed) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (admin-only endpoint) |
| 404 | Not found (report doesn't exist) |
| 422 | Validation error |
| 500 | Server error |
| 503 | Database/RabbitMQ unavailable |

### Error Response Format

```json
{
  "message": "Error description",
  "errors": [
    { "field": "name", "message": "Report name is required" }
  ]
}
```

---

## Security

### Authentication
- All endpoints require JWT token in `Authorization: Bearer <token>` header
- Token from Auth Service

### Authorization
- Admin-only endpoints: DELETE report
- Regular users can: Generate, view, list reports

### Validation
- Input validation on all POST/PUT operations
- Date range validation
- Type enum validation

### Database Security
- Parameterized queries via Prisma
- No SQL injection possible
- Role-based access control

---

## Performance

### Optimization Techniques

1. **Event Aggregation in Memory**
   - Last 1000 events cached in memory
   - Reduces database queries
   - O(1) event lookup

2. **Database Indexing**
   - Indexes on: type, period, createdAt, createdBy
   - Fast filtering and sorting

3. **Pagination**
   - Default limit: 10 items/page
   - Max limit: 100 items/page
   - Prevents memory overload

4. **Query Optimization**
   - Efficient WHERE clauses
   - Join optimization via Prisma
   - Connection pooling

---

## Monitoring

### Health Check

```bash
curl http://localhost:3007/health
```

### Logs

```bash
# Development (with colors)
npm run dev

# Production (JSON logs)
npm start
```

### Database Monitoring

```bash
# Connect to database
psql -U report_user -d report_db -h localhost -p 5438

# Check tables
\dt

# Count reports
SELECT COUNT(*) FROM "Report";

# Count metrics
SELECT COUNT(*) FROM "Metric";
```

---

## Scripts

```bash
npm run dev                # Start development server
npm run build              # Compile TypeScript
npm start                  # Run production build
npm run lint               # Run ESLint
npm run test               # Run Jest tests
npm run test:watch         # Watch mode tests
npm run prisma:migrate     # Create/run migrations
npm run prisma:seed        # Seed demo data
npm run prisma:studio      # Open Prisma Studio UI
```

---

## Version

- **Version**: 1.0.0
- **Last Updated**: 2026-04-29
- **Status**: Production Ready ✅

---

**Next Service**: Notification Service (Port 3008)
