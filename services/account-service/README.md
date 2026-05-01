# 👤 Account Service

User profile management, addresses, and membership service for The Everything Shop platform.

---

## 📋 Overview

The Account Service handles:
- ✅ User profile management
- ✅ Address management (multiple addresses per user)
- ✅ User preferences (currency, timezone, language, theme)
- ✅ Membership tier tracking
- ✅ User spending and order statistics
- ✅ Event publishing (profile updates, address changes, membership tier changes)
- ✅ Event subscription (receives USER_REGISTERED from Auth Service)

---

## 🗂️ Project Structure

```
account-service/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seed script
│   └── migrations/            # Database migrations (auto-generated)
├── src/
│   ├── index.ts               # Entry point
│   ├── app.ts                 # Express app setup
│   ├── modules/
│   │   └── account/
│   │       ├── index.ts       # Module exports
│   │       ├── account.controller.ts    # HTTP request handlers
│   │       ├── account.service.ts       # Business logic
│   │       ├── account.repository.ts    # Database operations
│   │       ├── account.routes.ts        # API routes
│   │       └── account.validation.ts    # Input validation
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

Service will be available at: `http://localhost:3002`

### 6. Verify

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "account-service",
  "timestamp": "2026-04-29T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

All endpoints require authentication (Bearer token in Authorization header).

### Profile Endpoints

#### 1. **GET** `/api/account/profile`

Get current user profile.

**Response:** (200 OK)
```json
{
  "message": "Profile retrieved successfully",
  "profile": {
    "id": "clv...",
    "userId": "clv...",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+84912345678",
    "avatar": null,
    "bio": "User bio",
    "membershipTier": "SILVER",
    "joinedAt": "2026-04-29T10:30:00Z",
    "totalSpent": 2000000,
    "totalOrders": 10,
    "totalReviews": 5,
    "emailNotifications": true,
    "smsNotifications": false,
    "marketingEmails": true,
    "createdAt": "2026-04-29T10:30:00Z",
    "updatedAt": "2026-04-29T10:30:00Z"
  }
}
```

---

#### 2. **POST** `/api/account/profile`

Create user profile (usually called automatically on user registration).

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** (201 Created)

---

#### 3. **PUT** `/api/account/profile`

Update user profile.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+84987654321",
  "bio": "Updated bio",
  "emailNotifications": true,
  "smsNotifications": true,
  "marketingEmails": false
}
```

**Response:** (200 OK) - Returns updated profile

---

### Address Endpoints

#### 4. **GET** `/api/account/addresses`

Get all user addresses.

**Response:** (200 OK)
```json
{
  "message": "Addresses retrieved successfully",
  "addresses": [
    {
      "id": "clv...",
      "profileId": "clv...",
      "type": "HOME",
      "label": "Home",
      "fullName": "John Doe",
      "phoneNumber": "+84912345678",
      "street": "Đường Nguyễn Huệ",
      "streetNumber": "100",
      "district": "Quận 1",
      "ward": "Phường Bến Nghé",
      "city": "Hồ Chí Minh",
      "zipCode": "70000",
      "country": "VN",
      "isDefault": true,
      "createdAt": "2026-04-29T10:30:00Z",
      "updatedAt": "2026-04-29T10:30:00Z"
    }
  ]
}
```

---

#### 5. **POST** `/api/account/addresses`

Add new address.

**Request Body:**
```json
{
  "type": "HOME",
  "label": "Home",
  "fullName": "John Doe",
  "phoneNumber": "+84912345678",
  "street": "Đường Nguyễn Huệ",
  "streetNumber": "100",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "city": "Hồ Chí Minh",
  "zipCode": "70000",
  "country": "VN",
  "isDefault": false
}
```

**Response:** (201 Created) - Returns created address

---

#### 6. **PUT** `/api/account/addresses/:addressId`

Update address.

**Request Body:** - Any subset of address fields

**Response:** (200 OK) - Returns updated address

---

#### 7. **DELETE** `/api/account/addresses/:addressId`

Delete address.

**Response:** (200 OK)
```json
{
  "message": "Address deleted successfully"
}
```

---

#### 8. **POST** `/api/account/addresses/:addressId/set-default`

Set address as default.

**Response:** (200 OK)

---

### Preferences Endpoints

#### 9. **GET** `/api/account/preferences`

Get user preferences.

**Response:** (200 OK)
```json
{
  "message": "Preferences retrieved successfully",
  "preferences": {
    "id": "clv...",
    "profileId": "clv...",
    "currency": "VND",
    "timezone": "Asia/Ho_Chi_Minh",
    "language": "vi",
    "theme": "light"
  }
}
```

---

#### 10. **PUT** `/api/account/preferences`

Update user preferences.

**Request Body:**
```json
{
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh",
  "language": "en",
  "theme": "dark"
}
```

**Response:** (200 OK) - Returns updated preferences

---

### Membership Endpoints

#### 11. **GET** `/api/account/membership`

Get membership information.

**Response:** (200 OK)
```json
{
  "message": "Membership information retrieved successfully",
  "membership": {
    "tier": "SILVER",
    "joinedAt": "2026-04-29T10:30:00Z",
    "totalSpent": 2000000,
    "totalOrders": 10,
    "totalReviews": 5
  }
}
```

---

## 🗄️ Database Schema

### UserProfile Model
```
- id: String (PK)
- userId: String (UNIQUE)
- firstName: String
- lastName: String
- phone: String?
- avatar: String?
- bio: String?
- membershipTier: Enum (BRONZE, SILVER, GOLD, PLATINUM)
- joinedAt: DateTime
- totalSpent: Float
- totalOrders: Int
- totalReviews: Int
- emailNotifications: Boolean
- smsNotifications: Boolean
- marketingEmails: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

### Address Model
```
- id: String (PK)
- profileId: String (FK → UserProfile)
- type: Enum (HOME, WORK, OTHER)
- label: String?
- fullName: String
- phoneNumber: String
- street: String
- streetNumber: String
- district: String
- ward: String
- city: String
- zipCode: String
- country: String
- isDefault: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

### Preference Model
```
- id: String (PK)
- profileId: String (UNIQUE FK → UserProfile)
- currency: String (default: "VND")
- timezone: String (default: "Asia/Ho_Chi_Minh")
- language: String (default: "vi")
- theme: String (default: "light")
- createdAt: DateTime
- updatedAt: DateTime
```

---

## 📡 Events

### Published Events

#### 1. PROFILE_UPDATED
Published when user profile is created or updated.

```json
{
  "type": "PROFILE_UPDATED",
  "aggregateId": "user-id",
  "data": {
    "userId": "clv...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "membershipTier": "SILVER"
  }
}
```

#### 2. ADDRESS_ADDED
Published when address is added.

```json
{
  "type": "ADDRESS_ADDED",
  "aggregateId": "user-id",
  "data": {
    "userId": "clv...",
    "addressId": "clv...",
    "type": "HOME",
    "city": "Hồ Chí Minh"
  }
}
```

#### 3. MEMBERSHIP_TIER_CHANGED
Published when membership tier changes.

```json
{
  "type": "MEMBERSHIP_TIER_CHANGED",
  "aggregateId": "user-id",
  "data": {
    "userId": "clv...",
    "tier": "GOLD",
    "previousTier": "SILVER"
  }
}
```

### Subscribed Events

#### USER_REGISTERED (from Auth Service)
When a user registers, Account Service automatically creates a profile.

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3002/health
```

### Test Get Profile
```bash
curl -X GET http://localhost:3002/api/account/profile \
  -H "Authorization: Bearer {accessToken}"
```

### Test Add Address
```bash
curl -X POST http://localhost:3002/api/account/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "type": "HOME",
    "fullName": "John Doe",
    "phoneNumber": "+84912345678",
    "street": "Đường Nguyễn Huệ",
    "streetNumber": "100",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "city": "Hồ Chí Minh",
    "zipCode": "70000"
  }'
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

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres-account

# Verify connection string in .env
cat .env | grep DATABASE_URL

# Try manual connection
psql -h localhost -p 5433 -U account_user -d account_db
```

### RabbitMQ Connection Failed

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check RabbitMQ logs
docker logs rabbitmq
```

### Event Handler Not Working

```bash
# Check RabbitMQ queue
# Visit http://localhost:15672
# Look for account-service-events-queue

# Check logs for subscription errors
npm run dev
```

---

## 📚 Architecture

```
┌──────────────────────┐
│  HTTP Request        │
│ (with Auth token)    │
└────────────┬─────────┘
             ↓
    ┌─────────────────┐
    │   Routes        │
    │ (with middleware)
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  Validation     │
    │ (express-val)   │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  Controller     │
    │ (HTTP handlers) │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │   Service       │
    │ (business logic)│
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Repository      │
    │ (Prisma)        │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │  PostgreSQL DB  │
    │ (account_db)    │
    └─────────────────┘
```

---

## 🔗 Integration with Other Services

**Account Service integrates with:**
- **Auth Service** - Listens for USER_REGISTERED events
- **Order Service** - Receives order statistics updates
- **Catalog Service** - Receives review count updates
- **API Gateway (Traefik)** - Routes /api/account/* requests

---

## 📋 Membership Tiers

| Tier | Min Spend | Benefits |
|------|-----------|----------|
| BRONZE | $0 | Basic member |
| SILVER | $1M+ VND | Free shipping |
| GOLD | $5M+ VND | 10% discount |
| PLATINUM | $10M+ VND | 20% discount + VIP support |

---

## 📝 Validation Rules

### Profile Validation
- firstName/lastName: 2+ characters
- phone: Valid phone format (optional)
- bio: Max 500 characters

### Address Validation
- type: HOME, WORK, or OTHER
- fullName: Required
- phoneNumber: Valid format
- street, district, ward, city, zipCode: Required
- country: 2-letter ISO code (default: VN)

### Preference Validation
- currency: Valid currency code
- timezone: Valid IANA timezone
- language: Valid language code
- theme: light or dark

---

## 📞 Support

For issues or questions:
1. Check logs: `npm run dev` (console)
2. Check database: `psql -h localhost -p 5433 -U account_user -d account_db`
3. Check RabbitMQ: `http://localhost:15672` (guest:guest)
4. Review code in `src/modules/account/`

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Status**: ✅ Production Ready
