# 🔐 Auth Service

Authentication and Authorization microservice for The Everything Shop platform.

---

## 📋 Overview

The Auth Service handles:
- ✅ User registration (signup)
- ✅ User authentication (login)
- ✅ JWT token generation and validation
- ✅ Refresh token management
- ✅ Password management (change password)
- ✅ User profile management
- ✅ Role-based access control (Admin, Seller, Customer)
- ✅ Event publishing (user.registered, user.login, user.logout)
- ✅ Audit logging

---

## 🗂️ Project Structure

```
auth-service/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Database migrations (auto-generated)
├── src/
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── auth/
│   │       ├── index.ts       # Module exports
│   │       ├── auth.controller.ts    # HTTP request handlers
│   │       ├── auth.service.ts       # Business logic
│   │       ├── auth.repository.ts    # Database operations
│   │       ├── auth.routes.ts        # API routes
│   │       └── auth.validation.ts    # Input validation
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

Service will be available at: `http://localhost:3001`

### 6. Verify

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

### Public Routes

#### 1. **POST** `/api/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** (201 Created)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

#### 2. **POST** `/api/auth/login`

Authenticate user and get tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```

**Response:** (200 OK)
```json
{
  "message": "Login successful",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Protected Routes (Require Authentication)

All protected routes require the `Authorization` header:
```
Authorization: Bearer {accessToken}
```

#### 3. **GET** `/api/auth/profile`

Get current user profile.

**Response:** (200 OK)
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "avatar": null,
    "createdAt": "2026-04-29T10:30:00.000Z",
    "updatedAt": "2026-04-29T10:30:00.000Z",
    "lastLogin": "2026-04-29T10:30:00.000Z"
  }
}
```

---

#### 4. **POST** `/api/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** (200 OK)
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### 5. **POST** `/api/auth/logout`

Log out user and revoke refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** (200 OK)
```json
{
  "message": "Logout successful"
}
```

---

#### 6. **POST** `/api/auth/change-password`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456",
  "confirmPassword": "NewPass@456"
}
```

**Response:** (200 OK)
```json
{
  "message": "Password changed successfully"
}
```

---

#### 7. **POST** `/api/auth/verify-token`

Verify if access token is valid (internal service use).

**Response:** (200 OK)
```json
{
  "message": "Token is valid",
  "valid": true,
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

---

## 🔑 JWT Token Format

### Access Token Payload

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "iat": 1704067800,
  "exp": 1704154200
}
```

**Expiry:** 24 hours (configurable via `JWT_EXPIRY`)

### Refresh Token Payload

```json
{
  "id": "user-id",
  "iat": 1704067800,
  "exp": 1711467800
}
```

**Expiry:** 7 days

---

## 🛡️ User Roles

- **ADMIN** - Full access to all resources
- **SELLER** - Can manage products and orders
- **CUSTOMER** - Regular user account

---

## 📊 Database Schema

### Users Table

```sql
users (
  id            CHAR(24) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  firstName     VARCHAR(255),
  lastName      VARCHAR(255),
  role          ENUM('ADMIN', 'SELLER', 'CUSTOMER'),
  status        ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'),
  avatar        VARCHAR(255),
  createdAt     TIMESTAMP DEFAULT NOW(),
  updatedAt     TIMESTAMP DEFAULT NOW(),
  lastLogin     TIMESTAMP
)
```

### Refresh Tokens Table

```sql
refresh_tokens (
  id            CHAR(24) PRIMARY KEY,
  token         VARCHAR(500) UNIQUE NOT NULL,
  userId        CHAR(24) FOREIGN KEY,
  expiresAt     TIMESTAMP NOT NULL,
  revokedAt     TIMESTAMP,
  createdAt     TIMESTAMP DEFAULT NOW()
)
```

### Audit Logs Table

```sql
audit_logs (
  id            CHAR(24) PRIMARY KEY,
  userId        CHAR(24) FOREIGN KEY NOT NULL,
  action        VARCHAR(255) NOT NULL,
  resource      VARCHAR(255),
  details       JSON,
  ipAddress     VARCHAR(45),
  userAgent     VARCHAR(255),
  createdAt     TIMESTAMP DEFAULT NOW()
)
```

---

## 📝 Events Published

The Auth Service publishes the following events to RabbitMQ:

### USER_REGISTERED

Published when a new user signs up.

```json
{
  "id": "event-id",
  "type": "USER_REGISTERED",
  "aggregateId": "user-id",
  "aggregateType": "User",
  "data": {
    "userId": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "timestamp": "2026-04-29T10:30:00.000Z",
  "version": 1,
  "source": "auth-service"
}
```

**Subscribers:**
- Account Service (create user profile)
- Notification Service (send welcome email)

---

### USER_LOGIN

Published when user logs in.

```json
{
  "id": "event-id",
  "type": "USER_LOGIN",
  "aggregateId": "user-id",
  "aggregateType": "User",
  "data": {
    "userId": "clv...",
    "email": "user@example.com"
  },
  "timestamp": "2026-04-29T10:30:00.000Z",
  "version": 1,
  "source": "auth-service"
}
```

---

### USER_LOGOUT

Published when user logs out.

```json
{
  "id": "event-id",
  "type": "USER_LOGOUT",
  "aggregateId": "user-id",
  "aggregateType": "User",
  "data": {
    "userId": "clv..."
  },
  "timestamp": "2026-04-29T10:30:00.000Z",
  "version": 1,
  "source": "auth-service"
}
```

---

## 🧪 Testing

### Run Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Coverage

```bash
npm run test -- --coverage
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

# Database migrations
npm run db:migrate      # Create & apply migrations
npm run db:push         # Push schema without migrations
npm run db:reset        # Reset database (dev only)
npm run db:seed         # Seed demo data
```

---

## 🐛 Troubleshooting

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Verify connection string in .env
cat .env | grep DATABASE_URL

# Try manual connection
psql -h localhost -p 5432 -U auth_user -d auth_db
```

### Issue: RabbitMQ Connection Failed

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check RabbitMQ logs
docker logs rabbitmq

# Verify connection URL in .env
cat .env | grep RABBITMQ_URL
```

### Issue: Prisma Client Generation Failed

```bash
# Regenerate Prisma client
npx prisma generate

# Reset node_modules
rm -rf node_modules package-lock.json
npm install
```

### Issue: JWT Token Verification Failed

```bash
# Check JWT_SECRET in .env
cat .env | grep JWT_SECRET

# Ensure it's the same value used in shared library
# Check Authorization header format: "Bearer {token}"
```

---

## 📚 Architecture

```
┌─────────────────────────────────────┐
│      HTTP Request (Express)         │
└────────────────┬────────────────────┘
                 ↓
        ┌─────────────────┐
        │   Route Layer   │
        │ (auth.routes)   │
        └────────┬────────┘
                 ↓
      ┌──────────────────────┐
      │   Validation Layer   │
      │ (auth.validation)    │
      └────────┬─────────────┘
               ↓
      ┌──────────────────────┐
      │  Controller Layer    │
      │ (auth.controller)    │
      └────────┬─────────────┘
               ↓
      ┌──────────────────────┐
      │   Service Layer      │
      │ (auth.service)       │
      └────────┬─────────────┘
               ↓
      ┌──────────────────────┐
      │ Repository Layer     │
      │ (auth.repository)    │
      └────────┬─────────────┘
               ↓
      ┌──────────────────────┐
      │   Database Layer     │
      │   PostgreSQL         │
      └──────────────────────┘
```

---

## 🔗 Integration with Other Services

The Auth Service integrates with:

- **Account Service** - Receives USER_REGISTERED event to create user profile
- **Catalog Service** - Verifies tokens for product reviews (via verify-token endpoint)
- **Order Service** - Verifies tokens for order creation
- **Payment Service** - Verifies tokens for payment operations
- **Notification Service** - Receives USER_REGISTERED to send welcome email
- **API Gateway (Traefik)** - Routes /api/auth/* requests

---

## 📋 Checklist for Production

- [ ] Change JWT_SECRET to a strong random key
- [ ] Enable HTTPS/TLS for all communications
- [ ] Setup CORS properly (define allowed origins)
- [ ] Enable rate limiting on auth endpoints
- [ ] Setup database backups
- [ ] Setup monitoring and logging
- [ ] Setup error tracking (Sentry, etc.)
- [ ] Load test the authentication endpoints
- [ ] Setup CI/CD pipeline
- [ ] Configure auto-scaling policies
- [ ] Setup health checks and alarms
- [ ] Document API for clients

---

## 📞 Support

For issues or questions:
1. Check logs: `docker logs auth-service`
2. Check database: `psql -h localhost -p 5432 -U auth_user -d auth_db`
3. Check RabbitMQ: `http://localhost:15672` (guest:guest)
4. Review code in `src/modules/auth/`

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
