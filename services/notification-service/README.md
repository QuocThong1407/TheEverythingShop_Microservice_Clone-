# Notification Service

Email notification management service for the TeleShop e-commerce platform. Handles event-driven email notifications with template rendering, retry logic, and multiple email provider support (SMTP/SendGrid).

**Port:** 3008

## Overview

The Notification Service is a microservice that receives events from other services in the TeleShop ecosystem and triggers automated email notifications to users. It provides:

- **Template-based Email Notifications**: Create and manage reusable email templates with dynamic variable substitution
- **Event-Driven Architecture**: Subscribes to 8 event types (user registration, orders, payments, returns, reviews)
- **Automatic Retry Logic**: Failed emails are automatically retried up to 3 times
- **Duplicate Prevention**: Prevents duplicate email sending through request deduplication
- **Multi-Provider Support**: Supports SMTP (Gmail, custom servers) and SendGrid
- **Background Processing**: Asynchronous email processing with 30-second batch intervals
- **Comprehensive API**: Full CRUD operations for templates and notification management

## Tech Stack

- **Runtime**: Node.js 18 LTS Alpine
- **Language**: TypeScript 5.3.3 (strict mode, ES2020)
- **Framework**: Express.js 5.x with middleware chain
- **Database**: PostgreSQL 15 (port 5439, database: `notification_db`)
- **ORM**: Prisma 5.7.1 with automated migrations
- **Message Broker**: RabbitMQ 3.12 (amqp://localhost:5672)
- **Logging**: pino 8.16.2 with structured JSON logs
- **Email**: nodemailer 6.9.7 (SMTP/SendGrid)
- **Validation**: express-validator 7.0.0
- **Testing**: Jest 29.7.0, ts-jest
- **Linting**: ESLint 8.54.0 with TypeScript support

## Quick Start

### Prerequisites
- Node.js 18+ or Docker
- PostgreSQL 15
- RabbitMQ 3.12
- Shared library (@teleshop/common) configured

### Installation

```bash
# Clone repository and install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL, RabbitMQ URL, and email credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed demo templates
npm run prisma:seed
```

### Development

```bash
# Start development server (hot reload)
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
npm run lint:fix
```

### Production

```bash
# Build application
npm run build

# Start production server
npm start

# Or using Docker
docker build -f prod.Dockerfile -t notification-service:latest .
docker run -d \
  --name notification-service \
  -p 3008:3008 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/notification_db" \
  -e RABBITMQ_URL="amqp://rabbitmq:5672" \
  -e EMAIL_PROVIDER="smtp" \
  notification-service:latest
```

## Architecture

### Layered Architecture

```
HTTP Layer (Express)
    ↓
Controllers (Request Handling)
    ↓
Routes (Middleware & Routing)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### Event-Driven Flow

```
External Service (Auth, Order, Payment, etc.)
    ↓
RabbitMQ 'events' Exchange (topic type)
    ↓
Notification Service Queue
    ↓
Event Handlers (8 types)
    ↓
Template Lookup & Rendering
    ↓
Email Service (SMTP/SendGrid)
    ↓
Background Processor (30s retry loop)
    ↓
Notification Status Updates
```

### Middleware Stack

```
pinoHttp (request logging)
    ↓
express.json (10MB limit)
    ↓
express.urlencoded
    ↓
currentUser (JWT extraction from Authorization header)
    ↓
Routes
    ↓
errorHandler (last - catches all errors)
```

## API Reference

### Base URL
```
http://localhost:3008/api/notifications
```

### Endpoints

#### Templates (Admin Only)

**Create Template**
```http
POST /api/notifications/templates
Authorization: Bearer {jwt_token}

{
  "name": "user_welcome",
  "eventType": "USER_REGISTERED",
  "subject": "Welcome to TeleShop!",
  "body": "<h1>Welcome {{userName}}!</h1><p>Email: {{email}}</p>",
  "variables": ["userName", "email"],
  "isActive": true
}

Response: 201 Created
{
  "message": "Template created successfully",
  "template": { ... }
}
```

**List Templates**
```http
GET /api/notifications/templates?skip=0&take=10&eventType=USER_REGISTERED&isActive=true
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "Templates retrieved successfully",
  "templates": [ ... ],
  "total": 8,
  "skip": 0,
  "take": 10
}
```

**Get Template**
```http
GET /api/notifications/templates/{templateId}
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "Template retrieved successfully",
  "template": { ... }
}
```

**Update Template**
```http
PUT /api/notifications/templates/{templateId}
Authorization: Bearer {jwt_token}

{
  "subject": "Updated Subject",
  "body": "Updated HTML content",
  "isActive": true
}

Response: 200 OK
{
  "message": "Template updated successfully",
  "template": { ... }
}
```

**Delete Template**
```http
DELETE /api/notifications/templates/{templateId}
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "Template deleted successfully",
  "template": { ... }
}
```

#### Notifications

**Get User Notifications**
```http
GET /api/notifications?skip=0&take=10
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "User notifications retrieved successfully",
  "notifications": [ ... ],
  "total": 25,
  "skip": 0,
  "take": 10
}
```

**Get Notification**
```http
GET /api/notifications/{notificationId}
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "Notification retrieved successfully",
  "notification": {
    "id": "uuid",
    "templateId": "uuid",
    "userId": "uuid",
    "email": "user@example.com",
    "eventType": "ORDER_CREATED",
    "subject": "Order Confirmed",
    "status": "SENT",
    "sentAt": "2024-01-15T10:30:00Z",
    "retryCount": 0
  }
}
```

**Resend Notification** (Admin Only)
```http
POST /api/notifications/{notificationId}/resend
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "message": "Notification queued for resending",
  "notification": { ... }
}
```

**Health Check**
```http
GET /health

Response: 200 OK
{
  "status": "ok",
  "service": "notification-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Event Types

### 1. USER_REGISTERED
**Template Variables**: `userName`, `email`
**Trigger**: When a new user registers
**Example Data**: 
```json
{
  "type": "USER_REGISTERED",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "userName": "John Doe"
  }
}
```

### 2. ORDER_CREATED
**Template Variables**: `orderId`, `totalAmount`, `currency`
**Trigger**: When a new order is placed
**Example Data**: 
```json
{
  "type": "ORDER_CREATED",
  "data": {
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "totalAmount": 500000
  }
}
```

### 3. ORDER_COMPLETED
**Template Variables**: `orderId`, `trackingNumber`
**Trigger**: When an order is shipped
**Example Data**: 
```json
{
  "type": "ORDER_COMPLETED",
  "data": {
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "trackingNumber": "TRACK123456"
  }
}
```

### 4. PAYMENT_SUCCESS
**Template Variables**: `orderId`, `paymentId`, `amount`, `currency`
**Trigger**: When payment is successfully processed
**Example Data**: 
```json
{
  "type": "PAYMENT_SUCCESS",
  "data": {
    "paymentId": "pay-456",
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "amount": 500000
  }
}
```

### 5. PAYMENT_FAILED
**Template Variables**: `paymentId`, `reason`
**Trigger**: When payment fails
**Example Data**: 
```json
{
  "type": "PAYMENT_FAILED",
  "data": {
    "paymentId": "pay-456",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "reason": "Insufficient funds"
  }
}
```

### 6. RETURN_CREATED
**Template Variables**: `returnId`, `orderId`, `reason`
**Trigger**: When a return request is created
**Example Data**: 
```json
{
  "type": "RETURN_CREATED",
  "data": {
    "returnId": "ret-789",
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "reason": "Product damaged"
  }
}
```

### 7. RETURN_COMPLETED
**Template Variables**: `returnId`, `refundAmount`, `currency`
**Trigger**: When a return is processed
**Example Data**: 
```json
{
  "type": "RETURN_COMPLETED",
  "data": {
    "returnId": "ret-789",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "refundAmount": 500000
  }
}
```

### 8. REVIEW_SUBMITTED
**Template Variables**: `reviewId`, `productName`, `rating`
**Trigger**: When a customer submits a review
**Example Data**: 
```json
{
  "type": "REVIEW_SUBMITTED",
  "data": {
    "reviewId": "rev-101",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "productName": "Laptop",
    "rating": 5
  }
}
```

## Database Schema

### Template Table
```sql
CREATE TABLE "Template" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_eventType ON "Template"(eventType);
CREATE INDEX idx_template_isActive ON "Template"(isActive);
```

### Notification Table
```sql
CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  templateId UUID REFERENCES "Template"(id),
  userId UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  eventId UUID NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status NotificationStatus DEFAULT 'PENDING',
  sentAt TIMESTAMP,
  openedAt TIMESTAMP,
  errorMessage VARCHAR(500),
  retryCount INT DEFAULT 0,
  maxRetries INT DEFAULT 3,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_userId ON "Notification"(userId);
CREATE INDEX idx_notification_email ON "Notification"(email);
CREATE INDEX idx_notification_eventType ON "Notification"(eventType);
CREATE INDEX idx_notification_status ON "Notification"(status);
CREATE INDEX idx_notification_createdAt ON "Notification"(createdAt);
CREATE INDEX idx_notification_sentAt ON "Notification"(sentAt);
```

### NotificationStatus Enum
- `PENDING` - Waiting to be sent
- `SENDING` - Currently sending
- `SENT` - Successfully sent
- `FAILED` - Failed after max retries
- `BOUNCED` - Email bounced
- `UNSUBSCRIBED` - User unsubscribed

## Configuration

### Environment Variables

```bash
# Service
PORT=3008
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@notification-db:5432/notification_db

# Authentication
JWT_SECRET=your-jwt-secret-key

# Message Queue
RABBITMQ_URL=amqp://rabbitmq:5672

# Email Sender
EMAIL_FROM=noreply@teleshop.com

# Email Provider: smtp (default) or sendgrid
EMAIL_PROVIDER=smtp

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid Configuration (alternative to SMTP)
# SENDGRID_API_KEY=your-sendgrid-api-key

# Logging
LOG_LEVEL=info
```

### Email Provider Setup

#### SMTP (Gmail Example)
1. Enable 2-factor authentication on Gmail
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Set `EMAIL_PROVIDER=smtp` in .env
4. Use the app password as `SMTP_PASSWORD`

#### SendGrid
1. Get API key from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Set `EMAIL_PROVIDER=sendgrid` in .env
3. Set `SENDGRID_API_KEY` in .env

## File Structure

```
notification-service/
├── src/
│   ├── index.ts                          # Entry point
│   ├── app.ts                            # Express app setup
│   ├── config/
│   │   └── database.ts                   # Prisma database config
│   ├── modules/
│   │   └── notification/
│   │       ├── notification.controller.ts # HTTP handlers
│   │       ├── notification.service.ts    # Business logic
│   │       ├── notification.repository.ts # Data access
│   │       ├── notification.validation.ts # Input validation
│   │       ├── notification.routes.ts     # Routes & middleware
│   │       └── index.ts                   # Module exports
│   └── services/
│       └── email.service.ts              # Email sending
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── migrations/                       # Migration files
│   └── seed.ts                           # Seed demo data
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.ts
├── .env
├── .env.example
├── .gitignore
├── dev.Dockerfile
├── prod.Dockerfile
└── README.md
```

## Error Handling

### Status Codes

- **200 OK** - Successful request
- **201 Created** - Resource created
- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Missing or invalid JWT token
- **403 Forbidden** - Insufficient permissions (not admin)
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate template name
- **422 Unprocessable Entity** - Validation failed
- **500 Internal Server Error** - Server error

### Error Response Format

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run only unit tests
npm run test -- src/__tests__/unit

# Run only integration tests
npm run test -- src/__tests__/integration
```

## Monitoring & Logging

### Health Endpoint
```bash
curl http://localhost:3008/health
```

### Structured Logs
All logs are in JSON format via pino:

```json
{
  "level": 30,
  "time": 1673863200000,
  "pid": 12345,
  "hostname": "container-id",
  "msg": "Notification sent successfully",
  "notificationId": "uuid",
  "status": "SENT"
}
```

## Performance Considerations

1. **Background Processing**: Notifications are processed in batches of 50 every 30 seconds
2. **Duplicate Prevention**: Uses in-memory Set to prevent concurrent processing
3. **Connection Pooling**: Prisma manages database connection pool
4. **Email Timeouts**: Default timeout 30 seconds per email
5. **Retry Strategy**: Exponential backoff (3 retries max)

## Integration with Other Services

### Publishing Events (From Other Services)

```typescript
// In another service (e.g., Auth Service)
await rabbit.publish('events', 'user.registered', {
  id: eventId,
  type: 'USER_REGISTERED',
  aggregateId: userId,
  data: {
    userId,
    email,
    userName
  },
  timestamp: new Date()
})
```

### Event Flow Example

```
Auth Service: User registers
  ↓
Publishes: user.registered event
  ↓
RabbitMQ topic exchange: 'events'
  ↓
Notification Service subscribes to: user.*
  ↓
handleUserRegistered() called
  ↓
Finds USER_REGISTERED template
  ↓
Renders template with user data
  ↓
Creates Notification record (PENDING)
  ↓
Queues for background processing
  ↓
Email sent via SMTP/SendGrid
  ↓
Updates status to SENT
```

## Troubleshooting

### Email Not Sending

1. **Check email configuration**: Verify SMTP/SendGrid credentials in .env
2. **Test email service**: Check logs for "Email service verification failed"
3. **Check RabbitMQ connection**: Verify RABBITMQ_URL
4. **Check database**: Verify DATABASE_URL and run migrations

### Templates Not Found

```bash
# Seed demo templates
npm run prisma:seed

# Check templates in database
npm run prisma:studio
```

### Event Not Triggering

1. Verify other service is publishing to correct event pattern
2. Check RabbitMQ queue bindings
3. Review Notification Service logs

## Security

- **Authentication**: JWT required for all endpoints except /health
- **Authorization**: Template management restricted to ADMIN role
- **Email Validation**: All emails validated before sending
- **Rate Limiting**: Recommended to add reverse proxy rate limiting
- **CORS**: Configure in production
- **SQL Injection**: Protected via Prisma ORM
- **XSS**: Email content sanitized before sending

## License

MIT

## Support

For issues and questions, please contact the TeleShop development team.
