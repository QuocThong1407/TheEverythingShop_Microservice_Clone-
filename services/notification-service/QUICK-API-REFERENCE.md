# Notification Service - Quick API Reference

Fast lookup guide for common operations.

## Setup

### 1. Start Service

**Docker (Recommended)**:
```bash
docker-compose up notification-service
```

**Local Development**:
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 2. Configure Email

**Gmail SMTP**:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Get from: myaccount.google.com/apppasswords
```

**SendGrid**:
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx  # From: app.sendgrid.com/settings/api_keys
```

### 3. Verify Health

```bash
curl http://localhost:3008/health
# Response: { "status": "ok", "service": "notification-service" }
```

## Authentication

All endpoints (except `/health`) require JWT token in header:

```bash
Authorization: Bearer {jwt_token}
```

Get token from Auth Service (`POST /api/auth/login`)

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET template successful |
| 201 | Created | POST template successful |
| 400 | Bad request | Missing required field |
| 401 | Unauthorized | Missing JWT token |
| 403 | Forbidden | Not admin role |
| 404 | Not found | Template/notification doesn't exist |
| 409 | Conflict | Duplicate template name |
| 422 | Invalid input | Template name < 3 chars |
| 500 | Server error | Database error |

## Template Management

### Create Template

```bash
curl -X POST http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome_email",
    "eventType": "USER_REGISTERED",
    "subject": "Welcome to TeleShop!",
    "body": "<h1>Welcome {{userName}}!</h1><p>Email: {{email}}</p>",
    "variables": ["userName", "email"],
    "isActive": true
  }'
```

**Response** (201):
```json
{
  "message": "Template created successfully",
  "template": {
    "id": "uuid",
    "name": "welcome_email",
    "eventType": "USER_REGISTERED",
    "subject": "Welcome to TeleShop!",
    "body": "<h1>Welcome {{userName}}!</h1><p>Email: {{email}}</p>",
    "variables": ["userName", "email"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### List Templates

```bash
curl http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {token}"
```

**Query Parameters**:
- `skip=0` - Offset (default: 0)
- `take=10` - Limit (default: 10, max: 100)
- `eventType=USER_REGISTERED` - Filter by event
- `isActive=true` - Filter by active status

**Response** (200):
```json
{
  "message": "Templates retrieved successfully",
  "templates": [
    {
      "id": "uuid",
      "name": "welcome_email",
      "eventType": "USER_REGISTERED",
      ...
    }
  ],
  "total": 8,
  "skip": 0,
  "take": 10
}
```

### Get Single Template

```bash
curl http://localhost:3008/api/notifications/templates/{templateId} \
  -H "Authorization: Bearer {token}"
```

**Response** (200):
```json
{
  "message": "Template retrieved successfully",
  "template": { ... }
}
```

### Update Template

```bash
curl -X PUT http://localhost:3008/api/notifications/templates/{templateId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "New Subject",
    "body": "Updated HTML content",
    "isActive": false
  }'
```

**Response** (200):
```json
{
  "message": "Template updated successfully",
  "template": { ... }
}
```

### Delete Template

```bash
curl -X DELETE http://localhost:3008/api/notifications/templates/{templateId} \
  -H "Authorization: Bearer {token}"
```

**Response** (200):
```json
{
  "message": "Template deleted successfully",
  "template": { ... }
}
```

## Notification Management

### List My Notifications

```bash
curl http://localhost:3008/api/notifications \
  -H "Authorization: Bearer {token}"
```

**Query Parameters**:
- `skip=0` - Offset
- `take=10` - Limit
- `status=SENT` - Filter (PENDING, SENDING, SENT, FAILED, BOUNCED, UNSUBSCRIBED)
- `eventType=ORDER_CREATED` - Filter

**Response** (200):
```json
{
  "message": "User notifications retrieved successfully",
  "notifications": [
    {
      "id": "uuid",
      "templateId": "uuid",
      "userId": "uuid",
      "email": "user@example.com",
      "eventType": "ORDER_CREATED",
      "subject": "Order Confirmed",
      "body": "<p>Your order #123 confirmed</p>",
      "status": "SENT",
      "sentAt": "2024-01-15T10:30:00Z",
      "openedAt": null,
      "retryCount": 0,
      "maxRetries": 3
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 10
}
```

### Get Notification

```bash
curl http://localhost:3008/api/notifications/{notificationId} \
  -H "Authorization: Bearer {token}"
```

**Response** (200):
```json
{
  "message": "Notification retrieved successfully",
  "notification": { ... }
}
```

### Resend Notification (Admin Only)

```bash
curl -X POST http://localhost:3008/api/notifications/{notificationId}/resend \
  -H "Authorization: Bearer {token}"
```

**What Happens**:
- Resets `retryCount` to 0
- Sets `status` to PENDING
- Immediately attempts to send
- Returns updated notification

**Response** (200):
```json
{
  "message": "Notification queued for resending",
  "notification": { ... }
}
```

## Event Types & Variables

### User Registered

**Event**: `user.registered`
**Template EventType**: `USER_REGISTERED`
**Available Variables**: `userName`, `email`

```json
{
  "type": "USER_REGISTERED",
  "data": {
    "userId": "uuid",
    "email": "john@example.com",
    "userName": "John Doe"
  }
}
```

### Order Created

**Event**: `order.created`
**Template EventType**: `ORDER_CREATED`
**Variables**: `orderId`, `totalAmount`, `currency`

```json
{
  "type": "ORDER_CREATED",
  "data": {
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "totalAmount": 500000
  }
}
```

### Order Completed

**Event**: `order.completed`
**Template EventType**: `ORDER_COMPLETED`
**Variables**: `orderId`, `trackingNumber`

```json
{
  "type": "ORDER_COMPLETED",
  "data": {
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "trackingNumber": "TRACK123456"
  }
}
```

### Payment Success

**Event**: `payment.success`
**Template EventType**: `PAYMENT_SUCCESS`
**Variables**: `orderId`, `paymentId`, `amount`, `currency`

```json
{
  "type": "PAYMENT_SUCCESS",
  "data": {
    "paymentId": "pay-456",
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "amount": 500000
  }
}
```

### Payment Failed

**Event**: `payment.failed`
**Template EventType**: `PAYMENT_FAILED`
**Variables**: `paymentId`, `reason`

```json
{
  "type": "PAYMENT_FAILED",
  "data": {
    "paymentId": "pay-456",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "reason": "Insufficient funds"
  }
}
```

### Return Created

**Event**: `return.created`
**Template EventType**: `RETURN_CREATED`
**Variables**: `returnId`, `orderId`, `reason`

```json
{
  "type": "RETURN_CREATED",
  "data": {
    "returnId": "ret-789",
    "orderId": "order-123",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "reason": "Product damaged"
  }
}
```

### Return Completed

**Event**: `return.completed`
**Template EventType**: `RETURN_COMPLETED`
**Variables**: `returnId`, `refundAmount`, `currency`

```json
{
  "type": "RETURN_COMPLETED",
  "data": {
    "returnId": "ret-789",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "refundAmount": 500000
  }
}
```

### Review Submitted

**Event**: `review.submitted`
**Template EventType**: `REVIEW_SUBMITTED`
**Variables**: `reviewId`, `productName`, `rating`

```json
{
  "type": "REVIEW_SUBMITTED",
  "data": {
    "reviewId": "rev-101",
    "userId": "uuid",
    "userEmail": "john@example.com",
    "productName": "Laptop",
    "rating": 5
  }
}
```

## Common Workflows

### Workflow 1: Create Welcome Email Template

```bash
# 1. Create template
curl -X POST http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome",
    "eventType": "USER_REGISTERED",
    "subject": "Welcome {{userName}}!",
    "body": "<p>Thanks for joining TeleShop, {{userName}}!</p>",
    "variables": ["userName", "email"]
  }'

# 2. Verify template created
curl http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {admin_token}"

# 3. When user registers, notification auto-created
# 4. Check notification status
curl http://localhost:3008/api/notifications \
  -H "Authorization: Bearer {user_token}"
```

### Workflow 2: Find Failed Emails to Resend

```bash
# 1. List failed notifications
curl "http://localhost:3008/api/notifications?status=FAILED" \
  -H "Authorization: Bearer {admin_token}"

# 2. Resend specific notification
curl -X POST http://localhost:3008/api/notifications/{notificationId}/resend \
  -H "Authorization: Bearer {admin_token}"

# 3. Verify it's queued (status=PENDING)
curl http://localhost:3008/api/notifications/{notificationId} \
  -H "Authorization: Bearer {admin_token}"
```

### Workflow 3: Update Email Template

```bash
# 1. Get current template
curl http://localhost:3008/api/notifications/templates/{templateId} \
  -H "Authorization: Bearer {admin_token}"

# 2. Update content
curl -X PUT http://localhost:3008/api/notifications/templates/{templateId} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "New Subject",
    "body": "<p>New content</p>"
  }'

# 3. New emails use updated template
```

## Troubleshooting

### Email Not Sending

**Check 1: Is service running?**
```bash
curl http://localhost:3008/health
# Should return 200 OK
```

**Check 2: Are templates seeded?**
```bash
curl http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {token}"
# Should return 8+ templates
```

**Check 3: Check service logs**
```bash
docker logs notification-service
# Look for: "Email service verification failed"
```

**Check 4: Is RabbitMQ running?**
```bash
curl http://localhost:15672/api/aliveness-test/% \
  -u guest:guest
# Should return {"status": "ok"}
```

**Check 5: Is database running?**
```bash
psql postgresql://user:pass@localhost:5439/notification_db -c "SELECT 1;"
```

### Notification Stuck in PENDING

**Causes**:
1. Background processor not running
2. Email service failed to initialize
3. Database connection lost

**Fix**:
1. Restart service: `docker restart notification-service`
2. Check logs: `docker logs notification-service`
3. Verify config: `docker exec notification-service env | grep EMAIL`
4. Manually resend: `curl -X POST .../notifications/{id}/resend`

### Template Not Found

```bash
# Seed templates
npm run prisma:seed

# Or manually create
curl -X POST http://localhost:3008/api/notifications/templates \
  -H "Authorization: Bearer {token}" \
  -d '{"name":"test","eventType":"USER_REGISTERED",...}'
```

## Performance Tips

1. **Batch operations**: Use pagination (take=50) for large datasets
2. **Bulk template operations**: Update multiple templates before syncing
3. **Monitor queue depth**: Check pending notifications regularly
4. **Scale horizontally**: Run multiple service instances
5. **Database indexes**: Ensure indexes on `userId`, `status`, `createdAt`

## Debugging

### Enable Verbose Logging

```bash
# In .env
LOG_LEVEL=debug

# Restart service
docker restart notification-service
```

### Check Database State

```bash
# Connect to database
psql postgresql://user:pass@localhost:5439/notification_db

# View templates
SELECT id, name, eventType, isActive FROM "Template";

# View pending notifications
SELECT id, email, eventType, status, retryCount FROM "Notification" 
WHERE status = 'PENDING';

# View failed notifications
SELECT id, email, eventType, errorMessage FROM "Notification" 
WHERE status = 'FAILED';
```

### Monitor RabbitMQ

```bash
# Access RabbitMQ admin panel
# URL: http://localhost:15672
# User: guest
# Pass: guest

# Or check queue via CLI
docker exec rabbitmq rabbitmqctl list_queues
```

## Rate Limits

No built-in rate limiting. Recommend adding reverse proxy (Nginx/Traefik):

```nginx
# Example: 10 requests per second per IP
limit_req_zone $binary_remote_addr zone=notif:10m rate=10r/s;
location /api/notifications {
    limit_req zone=notif burst=20 nodelay;
}
```

## Caching

- **Templates**: Not cached (always fresh from DB)
- **Notifications**: Not cached
- **Connection pooling**: Handled by Prisma

## Security Considerations

1. **Admin endpoints**: Always protected with `requireRole('ADMIN')`
2. **Token validation**: JWT verified on every request
3. **Email validation**: Sanitized before sending
4. **Input validation**: All fields validated via express-validator
5. **SQL injection**: Protected by Prisma ORM
6. **XSS prevention**: Email content is HTML but controlled via templates

---

**Last Updated**: 2024
**Version**: 1.0.0
