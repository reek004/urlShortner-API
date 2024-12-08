# URL Shortener API

A robust URL shortening service with authentication, rate limiting, and analytics features.

## Table of Contents
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Technical Stack](#technical-stack)
- [Security Features](#security-features)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

### URL Management
- Create short URLs (with optional custom aliases)
- Bulk URL creation
- URL expiration support
- QR code generation
- URL analytics and statistics

### Authentication & Security
- JWT token authentication
- API key support
- Rate limiting
- Email normalization
- Password validation

### Analytics
- Click tracking
- Browser statistics
- Referrer tracking
- Temporal analytics

## API Endpoints

### Authentication 

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh-api-key` - Refresh API key

### URL Operations

- `GET /urls` - List all URLs
- `POST /urls` - Create short URL
- `POST /urls/bulk` - Bulk create URLs
- `GET /:code` - Redirect to long URL
- `GET /urls/:code/stats` - Get URL statistics
- `GET /urls/:code/qr` - Get QR code
- `DELETE /urls/:code` - Delete URL

## Technical Stack
- **Backend Framework**: Node.js/Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens
- **Security**: Express Rate Limit
- **Features**: QR Code generation
- **Testing**: Jest & Supertest

## Security Features

### Rate Limiting
- Registration: 20 requests per 15 minutes
- Login: 10 requests per 15 minutes
- General API: 100 requests per 15 minutes

### Authentication
- JWT tokens with 24-hour expiration
- API key support for automated access
- Password hashing with bcrypt

### Input Validation
- Email format validation
- Password strength requirements
- URL format validation

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/reek004/urlShortner-API.git
cd urlShortner-API
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

4. Run the development server:
```bash
npm run dev
```

If you get the response like this:
```bash
Server is running on port 3000
Connected to MongoDB
```
You can now access the API at `http://localhost:3000`.

## Testing

To run all tests:
```bash
npm test
```

For watching tests during development:
```bash
npm run test:watch
```

For detailed test output:
```bash
npm test -- --verbose
```
### Authentication Tests (`auth.test.js`)

#### POST /auth/register
- ✓ Should register a new user
- ✓ Should reject duplicate email
- ✓ Should normalize email addresses
- ✓ Should validate email format
- ✓ Should require password minimum length

#### POST /auth/login
- ✓ Should login existing user
- ✓ Should reject invalid password
- ✓ Should reject non-existent user

#### Token Validation
- ✓ Should accept valid token
- ✓ Should reject malformed token
- ✓ Should reject missing token

#### API Key Validation
- ✓ Should accept valid API key
- ✓ Should reject invalid API key
- ✓ Should refresh API key

#### Rate Limiting
- ✓ Should limit registration attempts
- ✓ Should limit login attempts

### URL Shortener Tests (`url.test.js`)

#### GET /urls
- ✓ Should get all URLs for authenticated user with JWT token
- ✓ Should get all URLs for authenticated user with API key
- ✓ Should reject unauthorized request

#### POST /urls
- ✓ Should create a short URL with JWT token
- ✓ Should create a short URL with API key
- ✓ Should create a short URL with expiration
- ✓ Should reject invalid URLs
- ✓ Should reject duplicate custom aliases

#### POST /urls/bulk
- ✓ Should create multiple URLs
- ✓ Should handle invalid URLs in bulk creation

#### GET /:code
- ✓ Should redirect to long URL
- ✓ Should handle non-existent URLs

#### GET /urls/:code/stats
- ✓ Should return URL statistics
- ✓ Should handle non-existent URLs

#### GET /urls/:code/qr
- ✓ Should return QR code information
- ✓ Should handle non-existent URLs

#### DELETE /urls/:code
- ✓ Should successfully delete a URL
- ✓ Should return 404 when URL does not exist
- ✓ Should return 401 when not authenticated
- ✓ Should return 403 when trying to delete another user's URL
- ✓ Should accept API key authentication
- ✓ Should handle missing URL code parameter

#### Rate Limiting
- ✓ Should enforce rate limits

## API Documentation

**Base URL:** `http://localhost:3000`

## 1. Authentication Endpoints

### 1.1 Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response (201):**
```json
{
    "message": "User registered successfully",
    "token": "jwt_token",
    "apiKey": "api_key"
}
```

**Test Cases:**
- ✓ Should register a new user
- ✓ Should reject duplicate email
- ✓ Should normalize email addresses
- ✓ Should validate email format
- ✓ Should require password minimum length

### 1.2 Login User

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response (200):**
```json
{
    "message": "Login successful",
    "token": "jwt_token",
    "apiKey": "api_key"
}
```

**Test Cases:**
- ✓ Should login existing user
- ✓ Should reject invalid password
- ✓ Should reject non-existent user

### 1.3 Refresh API Key

**Endpoint:** `POST /auth/refresh-api-key`

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
    "message": "API key refreshed successfully",
    "apiKey": "new_api_key"
}
```

**Test Cases:**
- ✓ Should refresh API key
- ✓ Should reject invalid token

## 2. URL Management Endpoints

### 2.1 List All URLs

**Endpoint:** `GET /urls`

**Headers:** 
- `Authorization: Bearer <token>` 
  **OR**
- `X-API-Key: <api_key>`

**Response (200):**
```json
{
    "data": [
        {
            "urlCode": "abc123",
            "longUrl": "https://example.com",
            "shortUrl": "http://domain/abc123",
            "clicks": 0,
            "createdAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

**Test Cases:**
- ✓ Should get all URLs for authenticated user with JWT token
- ✓ Should get all URLs for authenticated user with API key
- ✓ Should reject unauthorized request

### 2.2 Create Short URL

**Endpoint:** `POST /urls`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
    "longUrl": "https://example.com",
    "customAlias": "custom-alias",  
    "expiresIn": 3600              
}
```

**Test Cases:**
- ✓ Should create a short URL with JWT token
- ✓ Should create a short URL with API key
- ✓ Should create a short URL with expiration
- ✓ Should reject invalid URLs
- ✓ Should reject duplicate custom aliases

### 2.3 Bulk URL Creation

**Endpoint:** `POST /urls/bulk`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
    "urls": [
        {
            "longUrl": "https://example1.com",
            "customAlias": "custom1"
        },
        {
            "longUrl": "https://example2.com"
        }
    ]
}
```

**Test Cases:**
- ✓ Should create multiple URLs
- ✓ Should handle invalid URLs in bulk creation

### 2.4 URL Redirection

**Endpoint:** `GET /:code`

**Test Cases:**
- ✓ Should redirect to long URL
- ✓ Should handle non-existent URLs

### 2.5 URL Statistics

**Endpoint:** `GET /urls/:code/stats`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
    "totalClicks": 100,
    "browserStats": {
        "Chrome": 60,
        "Firefox": 40
    },
    "referrerStats": {
        "google.com": 30,
        "direct": 70
    },
    "clicksByDate": {
        "2024-01-01": 50,
        "2024-01-02": 50
    }
}
```

**Test Cases:**
- ✓ Should return URL statistics
- ✓ Should handle non-existent URLs

### 2.6 QR Code Generation

**Endpoint:** `GET /urls/:code/qr`

**Headers:** `Authorization: Bearer <token>`

**Test Cases:**
- ✓ Should return QR code information
- ✓ Should handle non-existent URLs

### 2.7 Delete URL

**Endpoint:** `DELETE /urls/:code`

**Headers:** `Authorization: Bearer <token>`

**Test Cases:**
- ✓ Should successfully delete a URL
- ✓ Should return 404 when URL does not exist
- ✓ Should return 401 when not authenticated
- ✓ Should return 403 when trying to delete another user's URL
- ✓ Should accept API key authentication
- ✓ Should handle missing URL code parameter

## 3. Rate Limiting

Rate limits per endpoint:
- Registration: 20 requests per 15 minutes
- Login: 10 requests per 15 minutes
- General API: 100 requests per 15 minutes

**Test Cases:**
- ✓ Should limit registration attempts
- ✓ Should limit login attempts
- ✓ Should enforce rate limits on URL endpoints

## 4. Error Responses

### 400 Bad Request
```json
{
    "error": "Invalid input parameters"
}
```

### 401 Unauthorized
```json
{
    "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
    "status": "AUTH_ERROR",
    "message": "Authorization error"
}
```

### 404 Not Found
```json
{
    "status": "CLIENT_ERROR",
    "message": "No such URL"
}
```

### 429 Too Many Requests
```json
{
    "error": "Too many requests, please try again later"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new features
4. Ensure all tests pass
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request



