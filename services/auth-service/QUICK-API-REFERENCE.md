# 🔐 Auth Service - Quick API Reference

## 🚀 Quick Start

```bash
# 1. Install and setup
npm install && npm link @teleshop/common

# 2. Setup database
npx prisma migrate dev --name init
npm run db:seed

# 3. Start service
npm run dev
```

Service runs on: **http://localhost:3001**

---

## 📡 API Quick Reference

### Signup (Register)

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe"
}

# Response 201
{
  "message": "User registered successfully",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123"
}

# Response 200
{
  "message": "Login successful",
  "user": {...},
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### Get Profile

```bash
GET /api/auth/profile
Authorization: Bearer {accessToken}

# Response 200
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "lastLogin": "2026-04-29T10:30:00Z"
  }
}
```

---

### Refresh Token

```bash
POST /api/auth/refresh
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

# Response 200
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGc..."
}
```

---

### Logout

```bash
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

# Response 200
{
  "message": "Logout successful"
}
```

---

### Change Password

```bash
POST /api/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456",
  "confirmPassword": "NewPass@456"
}

# Response 200
{
  "message": "Password changed successfully"
}
```

---

### Verify Token (Internal)

```bash
POST /api/auth/verify-token
Authorization: Bearer {accessToken}

# Response 200
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

## 🔐 Demo Users

After running `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@teleshop.com | Demo@123456 | ADMIN |
| seller@teleshop.com | Demo@123456 | SELLER |
| customer@teleshop.com | Demo@123456 | CUSTOMER |

---

## 📊 Database

- **Database**: auth_db
- **Host**: localhost:5432
- **User**: auth_user / auth_password
- **Connection**: `postgresql://auth_user:auth_password@localhost:5432/auth_db`

Connect:
```bash
psql -h localhost -p 5432 -U auth_user -d auth_db
```

---

## 🐰 RabbitMQ

- **Host**: localhost:5672
- **Management**: http://localhost:15672
- **User**: guest / guest
- **Queue**: auth-service-events-queue
- **Exchange**: events (topic)

---

## 📋 Deployed Files

```
auth-service/
├── prisma/
│   ├── schema.prisma      ✅ 3 models (User, RefreshToken, AuditLog)
│   ├── seed.ts            ✅ Demo users
│   └── migrations/        ✅ Auto-generated
├── src/
│   ├── index.ts           ✅ Entry point + graceful shutdown
│   ├── app.ts             ✅ Express configuration
│   └── modules/auth/
│       ├── index.ts       ✅ Module exports
│       ├── auth.controller.ts    ✅ 7 endpoint handlers
│       ├── auth.service.ts       ✅ Business logic
│       ├── auth.repository.ts    ✅ Database operations
│       ├── auth.routes.ts        ✅ API routes
│       └── auth.validation.ts    ✅ Input validation
├── package.json           ✅ Dependencies
├── tsconfig.json          ✅ TypeScript config
├── Dockerfile.dev         ✅ Development image
├── .env                   ✅ Environment config
├── README.md              ✅ Full documentation
└── IMPLEMENTATION.md      ✅ Implementation details
```

---

## ✅ What's Implemented

- [x] User registration (signup)
- [x] User authentication (login)
- [x] Token refresh mechanism
- [x] Logout with token revocation
- [x] Password change
- [x] Profile management
- [x] Role-based access (ADMIN, SELLER, CUSTOMER)
- [x] JWT tokens (24h access, 7d refresh)
- [x] Password hashing (bcryptjs)
- [x] Event publishing (USER_REGISTERED, USER_LOGIN, USER_LOGOUT)
- [x] Audit logging
- [x] Database migrations
- [x] Error handling
- [x] Input validation
- [x] Graceful shutdown
- [x] RabbitMQ integration
- [x] Prisma ORM
- [x] Comprehensive documentation

---

## 🔧 Development

```bash
# Dev server (hot reload)
npm run dev

# Build
npm run build

# Production start
npm start

# Tests
npm run test
npm run test:watch

# Linting
npm run lint

# Database
npm run db:migrate      # Create migration
npm run db:push         # Push without migration
npm run db:reset        # Reset (dev only)
npm run db:seed         # Seed data
```

---

## 🚢 Deploy to Docker

```bash
# Build image
docker build -f Dockerfile.dev -t auth-service:dev .

# Run container
docker run -p 3001:3001 \
  --env-file .env \
  --network microservices \
  auth-service:dev
```

---

## 📞 Support

**Health Check**:
```bash
curl http://localhost:3001/health
```

**View Logs**:
```bash
docker logs auth-service
```

**Database**:
```bash
psql -h localhost -p 5432 -U auth_user -d auth_db
```

**RabbitMQ**:
```
http://localhost:15672 (guest:guest)
```

---

## 🎯 Next Steps

1. Test all endpoints locally
2. Run integration tests with other services
3. Deploy to Docker
4. Start implementing Account Service (follow same pattern)
5. Complete remaining 7 services

---

**Status**: ✅ Ready for Development  
**Service Port**: 3001  
**Database**: PostgreSQL (port 5432)  
**Message Broker**: RabbitMQ (port 5672)
