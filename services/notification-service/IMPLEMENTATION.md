# Notification Service - Implementation Guide

Comprehensive technical documentation for developers working with the Notification Service.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Details](#component-details)
3. [Request Flow](#request-flow)
4. [Event Handling](#event-handling)
5. [Retry Strategy](#retry-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)

## Architecture Overview

### Service Dependencies

```
┌─────────────────────────────────────────────────────┐
│         Notification Service (Port 3008)             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Express.js HTTP Layer                       │   │
│  │  - pinoHttp middleware for logging           │   │
│  │  - JSON body parsing (10MB limit)            │   │
│  │  - JWT currentUser extraction                │   │
│  │  - Error handling middleware                 │   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Routes & Controllers                        │   │
│  │  - Template CRUD (7 handlers)                │   │
│  │  - Notification management (3 handlers)      │   │
│  │  - Input validation chains                   │   │
│  │  - Error categorization (404, 400, 422, 500)│   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Notification Service                        │   │
│  │  - Event subscription & handling             │   │
│  │  - 8 event-specific handler methods          │   │
│  │  - Template rendering engine                 │   │
│  │  - Background processor (30s intervals)      │   │
│  │  - Retry logic with deduplication            │   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Repository Layer                            │   │
│  │  - NotificationRepository (15 methods)       │   │
│  │  - TemplateRepository (11 methods)           │   │
│  │  - Query optimization with indexes           │   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Email Service                               │   │
│  │  - SMTP/SendGrid abstraction                 │   │
│  │  - nodemailer transporter setup              │   │
│  │  - Connection verification                   │   │
│  │  - Error handling & recovery                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
         ↓                            ↓
    PostgreSQL            RabbitMQ (Message Broker)
    Database              (8 event patterns)
   (5439)                 (amqp://5672)
```

### External Integrations

```
┌─────────────────────┐
│  Other Services     │
│  (Auth, Order,      │
│   Payment, Return,  │
│   Review)           │
└──────────┬──────────┘
           │ Publish Events
           ↓
┌─────────────────────┐
│  RabbitMQ           │
│  Exchange: events   │
│  Type: topic        │
└──────────┬──────────┘
           │ Subscribe
           ↓
┌─────────────────────────┐
│ Notification Service    │
│ (Topic Patterns)        │
│ - user.*                │
│ - order.*               │
│ - payment.*             │
│ - return.*              │
│ - review.*              │
└─────────────────────────┘
```

## Component Details

### 1. NotificationService (notification.service.ts)

**Responsibility**: Core business logic for event-driven notifications

**Key Methods**:

#### initialize()
```typescript
async initialize(): Promise<void>
```
- Verifies email service connectivity
- Subscribes to 8 event patterns
- Starts 30-second background processor
- Catches and logs errors without throwing

#### subscribeToEvents()
```typescript
private async subscribeToEvents(): Promise<void>
```
- Subscribes to: user.*, order.*, payment.*, return.*, review.*
- Queue name: notification-service-events-queue
- Callback: handleEvent()

#### handleEvent(event)
```typescript
private async handleEvent(event: EventData): Promise<void>
```
- Route handler based on event.type
- Maps event types to handler methods
- Try-catch wrapping for error isolation

#### Event Handlers (8 total)
```typescript
private async handleUserRegistered(event: EventData)
private async handleOrderCreated(event: EventData)
private async handleOrderCompleted(event: EventData)
private async handlePaymentSuccess(event: EventData)
private async handlePaymentFailed(event: EventData)
private async handleReturnCreated(event: EventData)
private async handleReturnCompleted(event: EventData)
private async handleReviewSubmitted(event: EventData)
```

**Handler Pattern**:
1. Find template by eventType
2. Extract variables from event.data
3. Render template with variables
4. Create Notification record (status=PENDING)
5. Queue for async sending

#### renderTemplate(template, variables)
```typescript
private renderTemplate(template: string, variables: Record<string, any>): string
```
- Replaces `{{variable}}` placeholders
- Uses RegExp for case-insensitive global replacement
- Converts undefined/null to empty strings

#### sendNotification(notification)
```typescript
private async sendNotification(notification: Notification): Promise<void>
```
- Checks processingQueue to prevent duplicates
- Updates status to SENDING
- Calls emailService.send()
- On success: status = SENT
- On failure: status = PENDING (if retries < max) or FAILED
- Removes from processingQueue

#### startBackgroundProcessing()
```typescript
private startBackgroundProcessing(): void
```
- 30-second interval
- Fetches up to 50 PENDING notifications
- Sends each asynchronously
- Logs batch size

### 2. NotificationController (notification.controller.ts)

**Responsibility**: HTTP request handling

**Constructor**: Injects NotificationService

**Methods**:

#### createTemplate(req, res)
- Validates input (express-validator)
- Checks for duplicate name
- Calls notificationService.createTemplate()
- Returns 201 Created or error (409 Conflict)

#### listTemplates(req, res)
- Pagination: skip, take
- Filters: eventType, isActive
- Returns array with total count

#### getTemplate(req, res)
- Validates templateId (UUID)
- Returns 200 or 404

#### updateTemplate(req, res)
- Validates input
- Calls notificationService.updateTemplate()
- Returns updated template

#### deleteTemplate(req, res)
- Validates templateId
- Requires ADMIN role (enforced by middleware)
- Returns deleted template

#### getUserNotifications(req, res)
- Extracts userId from (req as any).currentUser
- Pagination: skip, take
- Returns notifications list

#### getNotification(req, res)
- Validates notificationId
- Returns 200 or 404

#### resendNotification(req, res)
- Calls notificationService.resendNotification()
- Resets retryCount to 0
- Immediately attempts send
- Returns updated notification

### 3. Repositories (notification.repository.ts)

#### TemplateRepository

**Methods**:

```typescript
create(data): Promise<Template>
findById(id): Promise<Template | null>
findByName(name): Promise<Template | null>
findByEventType(eventType, skip, take): Promise<Template[]>
list(filters, skip, take): Promise<Template[]>
count(filters): Promise<number>
update(id, data): Promise<Template>
delete(id): Promise<Template>
```

**Key Implementation**:
- `isActive` default filter: true
- Ordered by `createdAt DESC`
- Supports filtering by eventType + isActive

#### NotificationRepository

**Methods**:

```typescript
create(data): Promise<Notification>
findById(id): Promise<Notification | null>
findByUserId(userId, skip, take): Promise<Notification[]>
list(filters, skip, take): Promise<Notification[]>
count(filters): Promise<number>
updateStatus(id, status): Promise<Notification>
incrementRetry(id): Promise<Notification>
setError(id, error): Promise<Notification>
findPendingNotifications(limit): Promise<Notification[]>
findFailedNotifications(limit): Promise<Notification[]>
```

**Key Implementation**:
- `updateStatus()` sets `sentAt = now` if status = SENT
- `incrementRetry()` increments retryCount
- `findPendingNotifications()` returns PENDING + retryCount < maxRetries

### 4. Email Service (email.service.ts)

**Responsibility**: Abstract email sending

**Configuration**:

```typescript
if (process.env.EMAIL_PROVIDER === 'sendgrid') {
  // SendGrid SMTP relay
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  })
} else {
  // SMTP (default)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
}
```

**Methods**:

```typescript
async send(options: SendMailOptions): Promise<{
  success: boolean
  messageId?: string
  error?: string
}>

async verify(): Promise<boolean>
```

### 5. Validation (notification.validation.ts)

**8 Validators**:

1. **validateCreateTemplate**
   - name: 3-100 alphanumeric + _ -
   - eventType: required enum
   - subject: 5-255 chars
   - body: 10+ chars
   - variables: array of strings
   - isActive: boolean (optional)

2. **validateUpdateTemplate**
   - All fields optional
   - Same validation rules as create

3. **validateGetTemplate**
   - templateId: UUID format

4. **validateListTemplates**
   - skip: 0+
   - take: 1-100
   - eventType: optional
   - isActive: optional boolean

5. **validateGetNotification**
   - notificationId: UUID format

6. **validateListNotifications**
   - skip, take, userId, status, eventType: all optional

7. **validateResendNotification**
   - notificationId: UUID format

8. **validateDeleteTemplate**
   - templateId: UUID format

## Request Flow

### Creating a Notification (Event-Driven)

```
1. External Service publishes event to RabbitMQ
   {
     type: 'USER_REGISTERED',
     data: {
       userId: 'uuid',
       email: 'user@example.com',
       userName: 'John Doe'
     }
   }

2. RabbitMQ routes to notification-service-events-queue

3. Notification Service handleEvent() called
   - Identifies event type: USER_REGISTERED
   - Routes to handleUserRegistered()

4. handleUserRegistered():
   - Finds USER_REGISTERED template
   - Extracts: userName, email
   - Renders template body with variables
   - Creates Notification record (status=PENDING)
   - Calls sendNotificationAsync()

5. sendNotificationAsync():
   - Doesn't wait for completion
   - Resolves immediately
   - sendNotification() runs in background

6. sendNotification():
   - Checks processingQueue for duplicates
   - Updates status to SENDING
   - Calls emailService.send()
   - If success: status=SENT, updates sentAt
   - If fail & retries < 3: status=PENDING (keeps for retry)
   - If fail & retries >= 3: status=FAILED, stores errorMessage

7. Background processor (30s interval):
   - Fetches PENDING notifications
   - Attempts to resend up to 50 per batch
   - Increments retryCount on failure
```

### HTTP Request to Create Template

```
POST /api/notifications/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "welcome_template",
  "eventType": "USER_REGISTERED",
  "subject": "Welcome!",
  "body": "<p>Hi {{userName}}</p>",
  "variables": ["userName"],
  "isActive": true
}

1. pinoHttp middleware logs request
2. express.json parses body
3. currentUser middleware extracts JWT
4. Route middleware: requireAuth, requireRole('ADMIN')
5. validateCreateTemplate runs
   - If validation fails: 422 response
6. Controller createTemplate() called
7. Check for duplicate name
   - If exists: 409 Conflict
8. Call notificationService.createTemplate()
9. Prisma creates Template record
10. Return 201 Created + template object
11. pinoHttp logs response
```

## Event Handling

### Event Subscription Pattern

```typescript
// Subscribing to multiple patterns
const patterns = [
  'user.registered',      // USER_REGISTERED
  'order.created',        // ORDER_CREATED
  'order.completed',      // ORDER_COMPLETED
  'payment.success',      // PAYMENT_SUCCESS
  'payment.failed',       // PAYMENT_FAILED
  'return.created',       // RETURN_CREATED
  'return.completed',     // RETURN_COMPLETED
  'review.submitted',     // REVIEW_SUBMITTED
]

await rabbit.subscribe(
  'notification-service-events-queue',
  patterns,
  async (event) => {
    await handleEvent(event)
  }
)
```

### Event Type Mapping

```
RabbitMQ Pattern     → Event Type              → Handler Method
user.*               → USER_REGISTERED        → handleUserRegistered()
order.created        → ORDER_CREATED          → handleOrderCreated()
order.completed      → ORDER_COMPLETED        → handleOrderCompleted()
payment.success      → PAYMENT_SUCCESS        → handlePaymentSuccess()
payment.failed       → PAYMENT_FAILED         → handlePaymentFailed()
return.created       → RETURN_CREATED         → handleReturnCreated()
return.completed     → RETURN_COMPLETED       → handleReturnCompleted()
review.submitted     → REVIEW_SUBMITTED       → handleReviewSubmitted()
```

### Template Variable Injection

```
Template Body:
<h1>Welcome {{userName}}!</h1>
<p>Email: {{email}}</p>

Event Data:
{
  userName: 'John Doe',
  email: 'john@example.com'
}

After Rendering:
<h1>Welcome John Doe!</h1>
<p>Email: john@example.com</p>

Undefined Variables:
If userName is missing: <h1>Welcome !</h1>
```

## Retry Strategy

### Retry Logic

```
Initial Send Attempt
  ↓
Success → Status = SENT, update sentAt timestamp
  ↓
Failed → Status = PENDING, retryCount++
  ↓
Is retryCount < maxRetries (3)?
  ├─ YES → Keep status = PENDING, wait for background processor
  └─ NO  → Status = FAILED, store errorMessage

Background Processor (every 30s):
  Find all PENDING notifications
  Fetch batch of 50 (limit)
  For each notification:
    Try to send via email service
    If success: update status = SENT
    If fail: increment retryCount, check if < maxRetries
```

### Duplicate Prevention

```typescript
private processingQueue: Set<string> = new Set()

// Before processing
if (this.processingQueue.has(notificationId)) {
  return  // Skip if already processing
}

// Start processing
this.processingQueue.add(notificationId)

try {
  // Send email
  await emailService.send(...)
  // Update status
} finally {
  // Always cleanup
  this.processingQueue.delete(notificationId)
}
```

## Testing Strategy

### Unit Tests

```typescript
// Test template rendering
describe('NotificationService', () => {
  describe('renderTemplate', () => {
    it('should replace variables in template', () => {
      const template = 'Hello {{name}}'
      const rendered = service.renderTemplate(template, { name: 'John' })
      expect(rendered).toBe('Hello John')
    })

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}'
      const rendered = service.renderTemplate(template, {})
      expect(rendered).toBe('Hello ')
    })
  })

  describe('createTemplate', () => {
    it('should create template with valid data', async () => {
      const data = {
        name: 'test',
        eventType: 'USER_REGISTERED',
        subject: 'Test',
        body: 'Test body',
        variables: ['var1']
      }
      const result = await service.createTemplate(data)
      expect(result.id).toBeDefined()
    })
  })
})
```

### Integration Tests

```typescript
// Test event to notification flow
describe('Event Integration', () => {
  it('should create notification on USER_REGISTERED event', async () => {
    const event = {
      type: 'USER_REGISTERED',
      data: {
        userId: 'uuid',
        email: 'test@example.com',
        userName: 'Test'
      }
    }

    await service.handleEvent(event)

    const notification = await repo.findByUserId('uuid', 0, 1)
    expect(notification).toHaveLength(1)
    expect(notification[0].email).toBe('test@example.com')
  })

  it('should retry failed notifications', async () => {
    const notification = await repo.create({
      email: 'invalid@example.com',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3
    })

    // Mock email service to fail
    emailService.send = jest.fn().mockResolvedValue({
      success: false,
      error: 'Connection failed'
    })

    await service.sendNotification(notification)
    await service.startBackgroundProcessing()

    // Check retry count incremented
    const updated = await repo.findById(notification.id)
    expect(updated.retryCount).toBe(1)
  })
})
```

### E2E Tests

```typescript
// Test full request cycle
describe('E2E', () => {
  it('should create template and list templates', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/notifications/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'e2e-test',
        eventType: 'USER_REGISTERED',
        subject: 'Test',
        body: 'Body'
      })
    expect(createRes.status).toBe(201)

    // List
    const listRes = await request(app)
      .get('/api/notifications/templates')
      .set('Authorization', `Bearer ${token}`)
    expect(listRes.status).toBe(200)
    expect(listRes.body.templates).toContainEqual(
      expect.objectContaining({ name: 'e2e-test' })
    )
  })
})
```

## Deployment

### Docker Build

```bash
# Development
docker build -f dev.Dockerfile -t notification-service:dev .
docker run -it --rm \
  -v $(pwd)/src:/app/src \
  -p 3008:3008 \
  notification-service:dev

# Production
docker build -f prod.Dockerfile -t notification-service:latest .
docker run -d \
  --name notification-service \
  -p 3008:3008 \
  -e DATABASE_URL="postgresql://..." \
  -e RABBITMQ_URL="amqp://..." \
  notification-service:latest
```

### Environment Setup

**Production .env**:
```bash
PORT=3008
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@notification-db:5432/notification_db
JWT_SECRET=$(openssl rand -base64 32)
RABBITMQ_URL=amqp://rabbitmq:5672
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@teleshop.com
LOG_LEVEL=warn
```

### Database Migration

```bash
# In container
docker exec notification-service npm run prisma:migrate

# Or during build
CMD ["sh", "-c", "npm run prisma:migrate && npm start"]
```

### Health Check

```bash
# Docker health check
curl -f http://localhost:3008/health || exit 1

# Production monitoring
Every 30 seconds: GET /health
If status != 200: Container is unhealthy
```

### Graceful Shutdown

- Timeout: 30 seconds
- Handles: SIGTERM, SIGINT
- Closes: HTTP server → RabbitMQ → Database
- On timeout: Force exit

### Scaling

**Horizontal Scaling**:
- Each instance: independent event subscription
- All subscribe to same queue name
- RabbitMQ distributes messages

**Vertical Scaling**:
- Increase background processor batch size (50 → 100)
- Increase database connection pool
- Increase Node.js memory limit

---

**Last Updated**: 2024
**Version**: 1.0.0
