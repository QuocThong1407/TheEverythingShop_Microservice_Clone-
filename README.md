# The Everything Shop - Microservices Architecture

## 📋 Project Structure

```
Microservice/
├── services/                       # 8 Microservices
│   ├── auth-service/
│   ├── account-service/
│   ├── catalog-service/
│   ├── cart-service/              # Redis-based
│   ├── order-service/
│   ├── payment-service/
│   ├── report-service/
│   └── notification-service/
├── shared/                         # @teleshop/common library
│   ├── src/
│   │   ├── errors/                # Error classes
│   │   ├── middleware/            # Express middleware
│   │   ├── rabbitmq/              # RabbitMQ wrapper
│   │   └── events/                # Event definitions
│   └── package.json
└── infrastructure/
    ├── docker-compose.dev.yml     # Development environment
    ├── traefik/                   # API Gateway config
    └── Dockerfile.dev.template    # Service template
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18+
- **Docker & Docker Compose**: v24+
- **npm**: v9+

### 1. Setup Shared Library

```bash
cd shared
npm install
npm run build
npm link              # Make it available locally
```

Or install from each service:

```bash
npm install file:../shared
```

### 2. Setup Each Service

For each service (auth-service, account-service, etc.):

```bash
cd services/{service-name}
npm install
```

### 3. Environment Variables

Copy `.env.example` to `.env` in each service:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://user:password@postgres-{service}:5432/{service}_db
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
JWT_SECRET=your-secret-key
```

### 4. Docker Compose Setup

Start all services with Docker Compose:

```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up -d
```

This will start:

- **8 PostgreSQL databases** (ports 5432-5438)
- **RabbitMQ** (ports 5672, 15672 management)
- **Redis** (port 6379)
- **Traefik** (port 80, 8080 dashboard)
- **8 Microservices** (ports 3001-3008)

### 5. Verify Setup

```bash
# Check all services are running
docker-compose -f infrastructure/docker-compose.dev.yml ps

# Access Traefik Dashboard
# http://localhost:8080

# Access RabbitMQ Management
# http://localhost:15672 (guest:guest)

# Check database connections
psql -h localhost -U auth_user -d auth_db
```

## 📦 Shared Library (@teleshop/common)

### Error Handlers

```typescript
import {
  BaseError,
  RequestValidationError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseConnectionError,
  ServiceUnavailableError,
  InternalServerError,
} from '@teleshop/common/errors';

// Usage
throw new NotFoundError('User not found');
throw new RequestValidationError([{ field: 'email', message: 'Invalid email' }]);
```

### Middleware

```typescript
import {
  errorHandler,
  validateRequest,
  currentUser,
  requireAuth,
  requireRole,
} from '@teleshop/common/middleware';

const app = express();

// Setup middleware
app.use(currentUser);           // Optional auth extraction
app.use(requireAuth);           // Require authentication (use on protected routes)
app.use(requireRole('ADMIN'));  // Require specific role

// Validation middleware (from express-validator)
// Then call validateRequest to check errors
app.use(validateRequest);

// Global error handler (must be last)
app.use(errorHandler);
```

### RabbitMQ Service

```typescript
import {
  getRabbitMQService,
  type EventMessage,
} from '@teleshop/common/rabbitmq';

const rmq = getRabbitMQService();

// Initialize
await rmq.initialize();

// Publish Event
const event: EventMessage = {
  id: 'uuid',
  type: 'user.registered',
  aggregateId: 'user-123',
  aggregateType: 'User',
  data: { email: 'user@example.com' },
  timestamp: new Date().toISOString(),
  version: 1,
  source: 'auth-service',
};

await rmq.publish('user.registered', event);

// Subscribe to Events
await rmq.subscribe(
  'auth-events-queue',
  ['user.*', 'order.*'],
  async (message) => {
    console.log('Received event:', message);
    // Handle event
  }
);

// Close connection
await rmq.close();
```

### Events

```typescript
import {
  AuthEvents,
  OrderEvents,
  PaymentEvents,
  UserRegisteredData,
  OrderCreatedData,
  CHECKOUT_SAGA,
} from '@teleshop/common/events';

// Event types
const eventType = AuthEvents.USER_REGISTERED;  // 'user.registered'

// Event data
const eventData: UserRegisteredData = {
  id: 'event-123',
  timestamp: new Date().toISOString(),
  source: 'auth-service',
  version: 1,
  aggregateId: 'user-456',
  aggregateType: 'User',
  userId: 'user-456',
  email: 'user@example.com',
  role: 'CUSTOMER',
};

// Saga definition
console.log(CHECKOUT_SAGA);
```

## 🔌 Service Endpoints

### API Gateway (Traefik)

- **Base URL**: `http://localhost`
- **Auth Service**: `/api/auth`
- **Account Service**: `/api/account`
- **Catalog Service**: `/api/products`, `/api/categories`, `/api/reviews`
- **Cart Service**: `/api/cart`
- **Order Service**: `/api/orders`
- **Payment Service**: `/api/payments`
- **Report Service**: `/api/reports`
- **Notification Service**: `/api/notifications`

### Direct Service URLs (for development)

- Auth: `http://localhost:3001`
- Account: `http://localhost:3002`
- Catalog: `http://localhost:3003`
- Cart: `http://localhost:3004`
- Order: `http://localhost:3005`
- Payment: `http://localhost:3006`
- Report: `http://localhost:3007`
- Notification: `http://localhost:3008`

## 📝 Development Commands

### Build Shared Library

```bash
cd shared
npm run build
```

### Start Single Service (Development)

```bash
cd services/auth-service
npm run dev      # Watch mode
npm start        # Production mode
```

### Run Tests

```bash
npm test         # Run tests
npm run test:watch   # Watch mode
```

### Lint Code

```bash
npm run lint
```

### Database Migrations (Prisma)

```bash
cd services/{service-name}

# Create migration
npx prisma migrate dev --name {migration-name}

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset
```

## 🗄️ Database

### PostgreSQL Connections

Each service has its own database:

| Service | User | Password | Database | Port |
|---------|------|----------|----------|------|
| Auth | auth_user | auth_password | auth_db | 5432 |
| Account | account_user | account_password | account_db | 5433 |
| Catalog | catalog_user | catalog_password | catalog_db | 5434 |
| Order | order_user | order_password | order_db | 5435 |
| Payment | payment_user | payment_password | payment_db | 5436 |
| Report | report_user | report_password | report_db | 5437 |
| Notification | notification_user | notification_password | notification_db | 5438 |

### Connect to Database

```bash
psql -h localhost -p 5432 -U auth_user -d auth_db
```

## 🐰 RabbitMQ

- **URL**: `amqp://guest:guest@localhost:5672`
- **Management UI**: `http://localhost:15672`
- **Exchange**: `events` (topic exchange)
- **Queue Naming**: `{service}-events-queue`

## 💾 Redis

- **URL**: `redis://localhost:6379`
- **Used by**: Cart Service (shopping cart storage)

## 🔐 JWT Authentication

All protected routes require JWT token in `Authorization` header:

```bash
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:3001/api/auth/me
```

**JWT Secret**: Set in `.env` file (`JWT_SECRET`)

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f infrastructure/docker-compose.dev.yml logs {service-name}

# Rebuild containers
docker-compose -f infrastructure/docker-compose.dev.yml up --build

# Remove containers and volumes
docker-compose -f infrastructure/docker-compose.dev.yml down -v
```

### Database connection failed

```bash
# Check if postgres is running
docker-compose -f infrastructure/docker-compose.dev.yml ps postgres-auth

# Connect directly
psql -h 127.0.0.1 -U auth_user -d auth_db
```

### RabbitMQ not responding

```bash
# Restart RabbitMQ
docker-compose -f infrastructure/docker-compose.dev.yml restart rabbitmq

# Check logs
docker-compose -f infrastructure/docker-compose.dev.yml logs rabbitmq
```

## 📚 API Documentation

Each service should have its own API documentation:

- Auth Service: `/api/auth/docs`
- Catalog Service: `/api/products/docs`
- Order Service: `/api/orders/docs`
- Payment Service: `/api/payments/docs`

etc.

## 🚢 Production Deployment

For production deployment:

1. Use `docker-compose.prod.yml` (not included)
2. Setup Kubernetes manifests
3. Configure proper secrets management
4. Setup monitoring and logging
5. Enable SSL/TLS
6. Configure rate limiting

See `docs/deployment/` for details.

## 📞 Support

For issues or questions:

1. Check logs: `docker-compose logs {service}`
2. Review documentation in `docs/`
3. Check GitHub issues

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-28
