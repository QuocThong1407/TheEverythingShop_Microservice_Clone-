# ⚡ Account Service - Quick API Reference

**Service Port**: 3002  
**Base URL**: `http://localhost:3002/api/account`  
**Authentication**: Bearer token in `Authorization` header

---

## 🔑 Authentication

All endpoints require a valid JWT token from Auth Service:

```bash
Authorization: Bearer {accessToken}
```

---

## 📋 Endpoints

### 1. Profile: Get User Profile
```http
GET /api/account/profile
Authorization: Bearer {token}
```

**Response (200)**
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

### 2. Profile: Create Profile
```http
POST /api/account/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201)**
```json
{
  "message": "Profile created successfully",
  "profile": { ... }
}
```

---

### 3. Profile: Update Profile
```http
PUT /api/account/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+84987654321",
  "bio": "Updated bio",
  "emailNotifications": true,
  "smsNotifications": true,
  "marketingEmails": false
}
```

**Response (200)**
```json
{
  "message": "Profile updated successfully",
  "profile": { ... }
}
```

---

### 4. Address: Get All Addresses
```http
GET /api/account/addresses
Authorization: Bearer {token}
```

**Response (200)**
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

### 5. Address: Add New Address
```http
POST /api/account/addresses
Authorization: Bearer {token}
Content-Type: application/json

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

**Response (201)**
```json
{
  "message": "Address added successfully",
  "address": { ... }
}
```

**Validation Rules**
- `type`: Required, must be HOME/WORK/OTHER
- `label`: Optional, max 100 chars
- `fullName`: Required, 2+ chars
- `phoneNumber`: Required, valid format
- `street`: Required
- `streetNumber`: Required
- `district`: Required
- `ward`: Required
- `city`: Required
- `zipCode`: Required
- `country`: Optional, 2-letter code (default: VN)

---

### 6. Address: Update Address
```http
PUT /api/account/addresses/{addressId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "Jane Doe",
  "phoneNumber": "+84987654321"
}
```

**Response (200)**
```json
{
  "message": "Address updated successfully",
  "address": { ... }
}
```

---

### 7. Address: Delete Address
```http
DELETE /api/account/addresses/{addressId}
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "message": "Address deleted successfully"
}
```

---

### 8. Address: Set Default Address
```http
POST /api/account/addresses/{addressId}/set-default
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "message": "Default address updated successfully"
}
```

---

### 9. Preferences: Get Preferences
```http
GET /api/account/preferences
Authorization: Bearer {token}
```

**Response (200)**
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

### 10. Preferences: Update Preferences
```http
PUT /api/account/preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh",
  "language": "en",
  "theme": "dark"
}
```

**Response (200)**
```json
{
  "message": "Preferences updated successfully",
  "preferences": { ... }
}
```

**Supported Values**
- `currency`: VND, USD, EUR (ISO codes)
- `timezone`: Asia/Ho_Chi_Minh, America/New_York, Europe/London (IANA)
- `language`: vi, en, fr (ISO 639-1)
- `theme`: light, dark

---

### 11. Membership: Get Membership Info
```http
GET /api/account/membership
Authorization: Bearer {token}
```

**Response (200)**
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

## 🧪 cURL Examples

### Get Profile
```bash
curl -X GET http://localhost:3002/api/account/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Address
```bash
curl -X POST http://localhost:3002/api/account/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "HOME",
    "label": "Home",
    "fullName": "John Doe",
    "phoneNumber": "+84912345678",
    "street": "Street Name",
    "streetNumber": "123",
    "district": "District",
    "ward": "Ward",
    "city": "City",
    "zipCode": "70000",
    "country": "VN"
  }'
```

### Update Profile
```bash
curl -X PUT http://localhost:3002/api/account/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "bio": "Updated bio"
  }'
```

### Set Default Address
```bash
curl -X POST http://localhost:3002/api/account/addresses/{addressId}/set-default \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Preferences
```bash
curl -X PUT http://localhost:3002/api/account/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "currency": "USD",
    "language": "en",
    "theme": "dark"
  }'
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "First name must be at least 2 characters"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden - Access denied",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Profile not found",
  "statusCode": 404
}
```

### 500 Server Error
```json
{
  "message": "Internal server error",
  "statusCode": 500
}
```

---

## 🔄 Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

---

## 📡 Address Types

```
type: "HOME"   → Residential address
type: "WORK"   → Business address
type: "OTHER"  → Other address
```

---

## 🎯 Membership Tiers

```
BRONZE    → Base tier (0 VND+ spent)
SILVER    → 1,000,000+ VND spent
GOLD      → 5,000,000+ VND spent
PLATINUM  → 10,000,000+ VND spent
```

---

## 🧪 Test Flow

1. **Authenticate** - Get token from Auth Service
2. **Get Profile** - Retrieve current profile
3. **Update Profile** - Modify profile info
4. **Add Address** - Add new delivery address
5. **Get Addresses** - List all addresses
6. **Set Default** - Set primary address
7. **Get Preferences** - View preferences
8. **Update Preferences** - Change settings
9. **Get Membership** - View tier info

---

## 💻 Quick Setup

```bash
# Install
npm install

# Setup database
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed

# Start server
npm run dev

# Service ready at http://localhost:3002
```

---

## 🔗 Related Services

- **Auth Service** (port 3001) - Provides JWT tokens
- **Catalog Service** (port 3003) - Product reviews
- **Order Service** (port 3005) - Order statistics
- **API Gateway** (port 80) - Routes all requests

---

## 📚 Postman Collection

Import into Postman:
```json
{
  "info": {
    "name": "Account Service",
    "description": "11 account management endpoints"
  },
  "item": [
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "url": "http://localhost:3002/api/account/profile",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ]
      }
    }
  ]
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-29  
**Service**: Account Service (Port 3002)
