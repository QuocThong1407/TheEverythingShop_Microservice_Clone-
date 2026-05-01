# 🏗️ Report Service - Implementation Details

**Technical Architecture & Design Decisions**

---

## Table of Contents

- [File Structure](#file-structure)
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Event Subscription System](#event-subscription-system)
- [Metric Calculation](#metric-calculation)
- [Database Design](#database-design)
- [Error Handling](#error-handling)
- [Testing Strategy](#testing-strategy)

---

## File Structure

```
report-service/
├── src/
│   ├── modules/
│   │   └── report/
│   │       ├── report.validation.ts      # Input validators (6 functions)
│   │       ├── report.repository.ts      # Database CRUD (18 methods)
│   │       ├── report.service.ts         # Business logic (8+ methods)
│   │       ├── report.controller.ts      # HTTP handlers (6 methods)
│   │       ├── report.routes.ts          # Route definitions (6 routes)
│   │       └── index.ts                  # Module exports
│   ├── services/
│   │   └── (future: specialized services)
│   ├── config/
│   │   └── database.ts                   # Prisma setup
│   ├── app.ts                            # Express app setup
│   └── index.ts                          # Entry point
├── prisma/
│   ├── schema.prisma                     # Prisma ORM schema
│   └── seed.ts                           # Demo data
├── package.json                          # Dependencies
├── tsconfig.json                         # TypeScript config
├── jest.config.js                        # Test config
├── eslint.config.js                      # Linting config
├── .env                                  # Environment variables
├── prod.Dockerfile                       # Production Docker image
├── dev.Dockerfile                        # Development Docker image
├── .gitignore                            # Git exclusions
├── README.md                             # Overview documentation
├── IMPLEMENTATION.md                     # This file
└── QUICK-API-REFERENCE.md                # API quick reference

Total: 21 files
```

---

## Architecture Overview

### Layered Architecture

```
┌──────────────────────────────────────────┐
│      HTTP Endpoints (Controllers)        │
├──────────────────────────────────────────┤
│  generateReport()  listReports()          │
│  getReport()       getMetrics()           │
│  deleteReport()    getRecentReports()     │
└──────────────────────────────────────────┘
              ↓ (Validation middleware)
┌──────────────────────────────────────────┐
│          Routes & Validation             │
├──────────────────────────────────────────┤
│  POST /generate  GET /                    │
│  GET /:id        DELETE /:id              │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│        Service Layer (Business Logic)    │
├──────────────────────────────────────────┤
│  ReportService                           │
│  - subscribeToEvents()                   │
│  - generateReport()                      │
│  - calculateMetricsForReport()           │
│  - aggregateEventData()                  │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│      Repository Layer (Database CRUD)    │
├──────────────────────────────────────────┤
│  ReportRepository   (11 methods)         │
│  MetricRepository   (8 methods)          │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│            Prisma ORM                    │
├──────────────────────────────────────────┤
│  Models: Report, Metric                  │
│  Enums: ReportType, Period, Status       │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│        PostgreSQL Database               │
└──────────────────────────────────────────┘
```

### Event-Driven Subscription

```
RabbitMQ Exchange
(topic type: 'events')
        ↓
    (8 patterns)
    ↙ ↓ ↘
user.* order.* payment.* ... (subscriptions)
    ↘ ↓ ↙
Report Service Queue
(report-service-events-queue)
        ↓
ReportService.aggregateEventData()
        ↓
Update aggregated data in memory + DB
```

---

## Core Components

### 1. Report Validation (report.validation.ts)

**6 Validator Chains using express-validator:**

```typescript
validateCreateReport      // For POST /generate
validateListReports       // For GET / with filters
validateGetReport         // For GET /:id
validateGenerateReport    // For detailed generation
validateGetMetrics        // For GET /:id/metrics
validateDeleteReport      // For DELETE /:id

// Rules include:
- String length validation (3-255 characters)
- UUID format validation
- Date format (ISO8601)
- Date range logic (endDate > startDate)
- Enum value validation (type, period)
- Optional object validation (filters)
```

### 2. Report Repository (report.repository.ts)

**ReportRepository - 11 methods:**

```typescript
create()              // Insert new report with metrics
findById()            // Get report by ID with metrics
findByType()          // Filter by report type
findByPeriod()        // Filter by period
findByDateRange()     // Filter by date range
list()                // Multi-filter query
count()               // Count with filters
update()              // Update report fields
updateStatus()        // Update status only
delete()              // Delete report (cascade deletes metrics)
findRecent()          // Get last N reports
findByCreator()       // Filter by admin/creator
```

**MetricRepository - 8 methods:**

```typescript
create()              // Insert single metric
createMany()          // Bulk insert metrics
findByReportId()      // Get all metrics for report
findByMetricName()    // Search by metric name
findById()            // Get specific metric
deleteByReportId()    // Delete all metrics for report
count()               // Count metrics in report
```

### 3. Report Service (report.service.ts)

**Public Methods:**

```typescript
subscribeToEvents()           // Start listening to all event patterns
generateReport(data)          // Create report + calculate metrics
getReport(reportId)           // Fetch report with metrics
listReports(filters, skip, take)  // Query with pagination
getReportMetrics(reportId)    // Get metrics for report
deleteReport(reportId)        // Delete report
getRecentReports(limit)       // Get N most recent reports
```

**Private Methods:**

```typescript
aggregateEventData(event)           // Process incoming events
aggregateOrderMetrics(event, metrics)
aggregatePaymentMetrics(event, metrics)
aggregateUserMetrics(event, metrics)
aggregateReviewMetrics(event, metrics)
aggregateReturnMetrics(event, metrics)
calculateMetricsForReport(type, startDate, endDate)
sumMetric(data, field)              // Sum values
avgMetric(data, field)              // Calculate average
getEventTypesForReportType(type)    // Map report type to events
```

### 4. Report Controller (report.controller.ts)

**6 HTTP Handlers:**

```typescript
generateReport()    // POST /generate
listReports()       // GET /
getReport()         // GET /:reportId
getMetrics()        // GET /:reportId/metrics
deleteReport()      // DELETE /:reportId (admin)
getRecentReports()  // GET /recent
```

**Features:**
- Validation error handling
- JWT token extraction from currentUser middleware
- Error categorization (404, 400, 500)
- Standard response format

### 5. Report Routes (report.routes.ts)

**6 API Routes:**

```typescript
POST   /generate              → generateReport()
GET    /                      → listReports()
GET    /recent                → getRecentReports()
GET    /:reportId             → getReport()
GET    /:reportId/metrics     → getMetrics()
DELETE /:reportId             → deleteReport()

Middleware applied:
- requireAuth on all routes
- requireRole('ADMIN') on DELETE
- Validation chains on input
```

---

## Event Subscription System

### How It Works

```typescript
// In Report Service initialization:
async subscribeToEvents() {
  const patterns = [
    'user.*',
    'order.*',
    'payment.*',
    'cart.*',
    'product.*',
    'review.*',
    'return.*',
    'promotion.*',
  ]
  
  await this.rabbit.subscribe(
    'report-service-events-queue',  // Queue name
    patterns,                       // Patterns to match
    async (event) => {              // Handler
      await this.aggregateEventData(event)
    }
  )
}
```

### Event Processing Pipeline

```
1. RabbitMQ publishes event to 'events' exchange
   Format: {id, type, aggregateId, data, timestamp}

2. Event matches subscription pattern (e.g., order.*)

3. Event delivered to report-service-events-queue

4. ReportService.aggregateEventData(event) called

5. Extract event type and data

6. Update in-memory aggregation map

7. Call type-specific aggregator:
   - ORDER_CREATED     → aggregateOrderMetrics()
   - PAYMENT_SUCCESS   → aggregatePaymentMetrics()
   - USER_REGISTERED   → aggregateUserMetrics()
   - etc.

8. Add to event log (keep last 1000 events)

9. Event data stored for report generation
```

### Supported Event Types

| Event | Source | Metric Extracted |
|-------|--------|------------------|
| ORDER_CREATED | Order Service | order_count, total_order_value |
| PAYMENT_SUCCESS | Payment Service | payment_success_count, total_revenue |
| PAYMENT_FAILED | Payment Service | payment_failed_count |
| USER_REGISTERED | Auth Service | new_users_count |
| REVIEW_SUBMITTED | Review Service | review_count, total_rating |
| RETURN_CREATED | Order Service | return_initiated_count |
| RETURN_COMPLETED | Order Service | return_completed_count |

---

## Metric Calculation

### Calculation Strategy

**By Report Type:**

```typescript
// SALES Report
- total_revenue (sum of all payments)
- order_count (count of orders)
- avg_order_value (revenue / orders)

// ORDERS Report
- total_orders (count)
- avg_order_value (average payment per order)

// USERS Report
- new_users (count of registrations)

// PAYMENTS Report
- successful_payments (count)
- failed_payments (count)
- total_revenue (sum of successful)

// RETURNS Report
- returns_initiated (count)
- returns_completed (count)

// REVIEWS Report
- review_count (count)
- avg_rating (average rating)

// CUSTOM Report
- total_events (count)
- event_types breakdown
```

### Aggregation in Memory vs Database

```typescript
// In-Memory Aggregation (Fast)
- Last 1000 events
- Real-time calculations
- Used for current period metrics

// Database Aggregation (Historical)
- All stored events
- Historical trends
- Used for past period analysis

// When generating report:
1. Check if date range is recent (< 1000 events from memory)
   → Use in-memory aggregation
2. If older → Query from database
3. Combine both for accuracy
```

---

## Database Design

### Schema Relationships

```
Report (parent)
├── id (PK)
├── name
├── type
├── period
├── startDate
├── endDate
├── createdBy (FK to User)
├── status
└── ↓ (1-to-many)
    Metric (child)
    ├── id (PK)
    ├── reportId (FK)
    ├── metricName
    ├── value
    ├── unit
    └── metadata (JSON)

// Foreign key: reportId → Report.id
// On delete: CASCADE (delete metrics with report)
```

### Indexes

```sql
-- Report indexes
CREATE INDEX idx_report_type ON "Report"(type);
CREATE INDEX idx_report_period ON "Report"(period);
CREATE INDEX idx_report_createdAt ON "Report"("createdAt");
CREATE INDEX idx_report_createdBy ON "Report"("createdBy");

-- Metric indexes
CREATE INDEX idx_metric_reportId ON "Metric"("reportId");
CREATE INDEX idx_metric_metricName ON "Metric"("metricName");
```

### Query Optimization

```typescript
// Efficient queries via Prisma

// ✅ GOOD - Returns only needed fields
const reports = await prisma.report.findMany({
  select: { id: true, name: true, type: true },
  where: { type: 'SALES' },
  orderBy: { createdAt: 'desc' }
})

// ❌ BAD - N+1 query problem
const reports = await prisma.report.findMany()
for (const report of reports) {
  const metrics = await prisma.metric.findMany({
    where: { reportId: report.id }
  })
}

// ✅ GOOD - Include relation in one query
const reports = await prisma.report.findMany({
  include: { metrics: true },
  where: { type: 'SALES' }
})
```

---

## Error Handling

### Error Classification

```typescript
// 400 Bad Request
- Invalid input data
- Date range invalid (endDate < startDate)
- Limit out of range (not 1-100)

// 401 Unauthorized
- Missing JWT token
- Invalid/expired token

// 403 Forbidden
- Non-admin trying to delete report

// 404 Not Found
- Report doesn't exist
- Metric doesn't exist

// 422 Unprocessable Entity
- Validation errors (express-validator)
- Type enum invalid

// 500 Internal Server Error
- Database connection error
- Unexpected exceptions

// 503 Service Unavailable
- Database down
- RabbitMQ down
```

### Error Response Format

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "startDate",
      "message": "Start date cannot be in the future"
    }
  ]
}
```

### Try-Catch Strategy

```typescript
// All handlers wrapped in try-catch
async handler(req, res) {
  try {
    // Validation
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({...})
    }
    
    // Business logic
    const result = await service.doSomething()
    
    return res.status(200).json({result})
  } catch (error) {
    // Log error
    log.error('Error:', error)
    
    // Categorize and respond
    if (error instanceof NotFoundError) {
      res.status(404).json({...})
    } else if (error instanceof BadRequestError) {
      res.status(400).json({...})
    } else {
      res.status(500).json({...})
    }
  }
}
```

---

## Testing Strategy

### Unit Tests (for Services)

```typescript
// Tests for ReportService

describe('ReportService', () => {
  describe('generateReport', () => {
    it('should create report with metrics', async () => {
      const report = await reportService.generateReport({
        name: 'Test Report',
        type: 'SALES',
        period: 'MONTHLY',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
        createdBy: 'user-id'
      })
      
      expect(report.id).toBeDefined()
      expect(report.metrics.length).toBeGreaterThan(0)
    })
    
    it('should calculate correct metrics', async () => {
      // Add test events to aggregatedData
      // Generate report
      // Assert metric values
    })
  })
  
  describe('calculateMetricsForReport', () => {
    it('should sum revenue correctly', () => {
      // Test metric calculation
    })
  })
})
```

### Integration Tests

```typescript
// Tests for Service ↔ Database ↔ RabbitMQ

describe('Report Service Integration', () => {
  beforeAll(async () => {
    // Connect to test database
    // Start test RabbitMQ
  })
  
  it('should aggregate order events into metrics', async () => {
    // Publish ORDER_CREATED event to RabbitMQ
    // Wait for aggregation
    // Assert metrics updated
  })
  
  it('should persist report to database', async () => {
    // Generate report
    // Query database directly
    // Assert data saved
  })
})
```

### API Tests

```typescript
// Tests for HTTP endpoints

describe('Report Endpoints', () => {
  describe('POST /generate', () => {
    it('should return 201 with report', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Report',
          type: 'SALES',
          period: 'MONTHLY',
          startDate: '2026-04-01T00:00:00Z',
          endDate: '2026-04-30T23:59:59Z'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.report.id).toBeDefined()
    })
    
    it('should return 422 on validation error', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'ab',  // Too short
          type: 'INVALID'
        })
      
      expect(response.status).toBe(422)
      expect(response.body.errors).toBeDefined()
    })
  })
})
```

---

## Performance Considerations

### Memory Efficiency

```typescript
// Event log limited to 1000 events
if (this.eventLog.length > 1000) {
  this.eventLog = this.eventLog.slice(-1000)  // Keep last 1000
}

// Prevents:
- Memory leaks
- High RAM usage
- Slow array operations
```

### Database Performance

```typescript
// Indexes ensure fast queries:
- type, period, createdAt, createdBy indexed
- Range queries optimized
- Sorting by createdAt uses index
- Foreign key lookups fast

// Pagination prevents large result sets:
- Default limit: 10
- Max limit: 100
- Offset-based pagination
```

### Query Optimization

```typescript
// Use include instead of separate queries
const reports = await prisma.report.findMany({
  include: { metrics: true }  // 1 query, not N+1
})

// Select only needed fields
const reports = await prisma.report.findMany({
  select: { id: true, name: true }  // Reduces payload
})
```

---

## Security Considerations

### Input Validation

```typescript
// All inputs validated before processing
- String length checks
- Date format validation
- Enum value validation
- No SQL injection (Prisma parameterized queries)
```

### Authentication & Authorization

```typescript
// JWT token required
- Extracted from Authorization header
- Verified via currentUser middleware
- User ID used for createdBy tracking

// Admin-only endpoints
- DELETE /reports/:id requires admin role
- Checked via requireRole('ADMIN') middleware
```

### Data Isolation

```typescript
// No cross-tenant data access
// Each report owned by creator
// Cannot access other users' reports
// Admin can view/delete any report
```

---

## Deployment

### Environment Variables

```env
PORT=3007
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
RABBITMQ_URL=amqp://...
```

### Docker

```dockerfile
# Multi-stage build for optimized image
FROM node:18-alpine as builder
  # Install deps
  # Build TypeScript

FROM node:18-alpine
  # Copy built app
  # Install prod deps only
  # Run npm start

HEALTHCHECK
  # Pings /health endpoint
  # Marks unhealthy if fails
```

### Graceful Shutdown

```typescript
// Handles SIGTERM/SIGINT
process.on('SIGTERM', async () => {
  // Stop accepting requests
  // Finish pending requests
  // Close RabbitMQ connection
  // Disconnect database
  // Exit process
})
```

---

## Version

- **Report Service**: 1.0.0
- **Last Updated**: 2026-04-29
- **Status**: Production Ready ✅
