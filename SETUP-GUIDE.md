# 🚀 Quick Start Guide - Setup Microservices Architecture

Hướng dẫn chi tiết để khởi tạo và chạy The Everything Shop microservices.

---

## 📦 Yêu Cầu

- **Node.js**: v18+ LTS
- **npm**: v9+
- **Docker & Docker Compose**: v24+
- **Git**

---

## 🔧 Setup Từng Bước

### Bước 1: Chuẩn Bị Shared Library

Shared library là nền tảng dùng chung cho tất cả services.

```bash
cd Microservice/shared

# Cài dependencies
npm install

# Build TypeScript
npm run build

# Tạo symlink để các services có thể dùng
npm link
```

**Kết quả**: Folder `dist/` được tạo, library sẵn sàng sử dụng.

---

### Bước 2: Cấu Hình Mỗi Service

Với mỗi service (auth-service, account-service, etc.):

```bash
cd services/{service-name}

# 2.1: Copy .env.example → .env
cp .env.example .env

# 2.2: Cài dependencies
npm install

# 2.3: Link shared library (hoặc sử dụng file path)
npm link @teleshop/common
```

**Ví dụ cho Auth Service:**

```bash
cd services/auth-service
cp .env.example .env
npm install
npm link @teleshop/common
```

---

### Bước 3: Khởi Động Docker Compose

Tất cả infrastructure (databases, RabbitMQ, Redis, Traefik) chạy qua Docker Compose.

```bash
cd infrastructure

# Khởi động tất cả services
docker-compose -f docker-compose.dev.yml up -d

# Kiểm tra status
docker-compose -f docker-compose.dev.yml ps
```

**Services sẽ start:**

```
✓ postgres-auth (port 5432)
✓ postgres-account (port 5433)
✓ postgres-catalog (port 5434)
✓ postgres-order (port 5435)
✓ postgres-payment (port 5436)
✓ postgres-report (port 5437)
✓ postgres-notification (port 5438)
✓ rabbitmq (ports 5672, 15672)
✓ redis (port 6379)
✓ traefik (ports 80, 8080)
✓ 8 microservices (ports 3001-3008)
```

---

### Bước 4: Kiểm Tra Hạ Tầng

Xác nhận tất cả services đang chạy:

```bash
# Traefik Dashboard
open http://localhost:8080

# RabbitMQ Management
open http://localhost:15672
# Username: guest | Password: guest

# Health Check - Auth Service
curl http://localhost:3001/health

# Health Check - All Services
for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
  curl http://localhost:$port/health
done
```

**Expected Response:**

```json
{ "status": "ok", "service": "auth-service" }
```

---

## 📂 Cấu Trúc File Chi Tiết

```
Microservice/
│
├── shared/                           # Shared Library
│   ├── package.json                 # Dependencies, exports
│   ├── tsconfig.json
│   ├── src/
│   │   ├── errors/
│   │   │   └── index.ts             # Error classes
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts      # Global error handling
│   │   │   ├── validateRequest.ts   # Validation middleware
│   │   │   ├── auth.ts              # JWT authentication
│   │   │   └── index.ts             # Exports
│   │   ├── rabbitmq/
│   │   │   └── index.ts             # RabbitMQ Singleton
│   │   ├── events/
│   │   │   └── index.ts             # Event definitions
│   │   └── index.ts                 # Main exports
│   ├── dist/                        # Built files (after npm run build)
│   └── node_modules/
│
├── services/
│   └── auth-service/                # Template: replicate for other services
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile.dev
│       ├── .env.example
│       ├── src/
│       │   ├── index.ts             # Entry point
│       │   ├── app.ts               # Express setup
│       │   ├── modules/
│       │   │   └── auth/
│       │   │       ├── auth.controller.ts
│       │   │       ├── auth.service.ts
│       │   │       ├── auth.routes.ts
│       │   │       └── auth.repository.ts
│       │   ├── middleware/
│       │   ├── utils/
│       │   └── types/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── tests/
│       │   ├── unit/
│       │   └── integration/
│       └── dist/
│
├── infrastructure/
│   ├── docker-compose.dev.yml       # Development environment
│   ├── docker-compose.prod.yml      # (TODO) Production environment
│   ├── traefik/
│   │   └── traefik.yml              # API Gateway config
│   ├── kubernetes/                  # (TODO) K8s manifests
│   └── Dockerfile.dev.template      # Service template
│
├── docs/                            # Existing docs
│   ├── plan.md                      # v2.0 kế hoạch
│   ├── polyrepo-structure.md
│   ├── daily-timeline.md
│   └── CONFIRMATION-CHECKLIST.md
│
├── README.md                        # Project README
├── .env.example                     # Environment template
├── .gitignore
└── node_modules/
```

---

## 🗄️ Database Setup

Mỗi service có database riêng (PostgreSQL):

```bash
# Connect to Auth Service DB
psql -h localhost -p 5432 -U auth_user -d auth_db

# Connect to Account Service DB
psql -h localhost -p 5433 -U account_user -d account_db

# Etc...
```

### Prisma Migrations (Khi có Prisma Schema)

```bash
cd services/{service-name}

# Create migration
npx prisma migrate dev --name init

# Apply migration
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

---

## 🐰 RabbitMQ Event System

RabbitMQ là message broker cho event-driven communication.

### Management UI

```
URL: http://localhost:15672
Username: guest
Password: guest
```

### Topic Exchange: `events`

Tất cả events publish tới exchange `events` với routing key theo pattern:

- `user.registered` → Auth Service
- `order.created` → Order Service
- `payment.success` → Payment Service
- Etc...

### Queue Naming Convention

Mỗi service subscribe tới queue theo format:

```
{service-name}-events-queue
```

Ví dụ:
- `order-service-events-queue`
- `payment-service-events-queue`

---

## 🔐 JWT Authentication

Tất cả protected routes require JWT token.

### Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### JWT Secret

Set trong `.env`:

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h
```

---

## 🐛 Troubleshooting

### Problem: Docker container won't start

```bash
# Xem logs
docker-compose -f infrastructure/docker-compose.dev.yml logs {service-name}

# Rebuild
docker-compose -f infrastructure/docker-compose.dev.yml up --build

# Clean slate
docker-compose -f infrastructure/docker-compose.dev.yml down -v
docker-compose -f infrastructure/docker-compose.dev.yml up -d
```

### Problem: Port đã bị chiếm

```bash
# Kiểm tra port nào đang chiếm
lsof -i :{port}

# Kill process
kill -9 {PID}
```

### Problem: Shared library not found

```bash
# Trong service directory
npm link @teleshop/common

# Hoặc cài directly
npm install file:../../shared
```

### Problem: Database connection failed

```bash
# Test kết nối
psql -h localhost -p 5432 -U auth_user -d auth_db

# Check docker logs
docker-compose -f infrastructure/docker-compose.dev.yml logs postgres-auth
```

---

## ✅ Verification Checklist

Sau khi setup, xác nhận:

- [ ] Docker containers chạy: `docker-compose ps`
- [ ] Traefik dashboard accessible: `http://localhost:8080`
- [ ] RabbitMQ UI accessible: `http://localhost:15672`
- [ ] All services respond to health check
- [ ] Redis responds: `redis-cli ping`
- [ ] PostgreSQL accessible từ mỗi service
- [ ] Shared library built: `shared/dist/` exists
- [ ] Services link shared library: `npm list @teleshop/common`

---

## 📝 Tiếp Theo

Sau khi setup xong:

1. **Schema Design**: Tạo Prisma schema cho mỗi service
2. **Routes & Controllers**: Implement API routes
3. **Event Handlers**: Setup RabbitMQ consumers
4. **Testing**: Unit & Integration tests
5. **Deployment**: Setup K8s manifests

Xem `docs/daily-timeline.md` để chi tiết.

---

## 📞 Support

- Xem README.md cho API endpoints
- Xem docs/ cho architecture details
- Check logs: `docker-compose logs {service}`

---

**Chúc bạn setup thành công!** 🎉
