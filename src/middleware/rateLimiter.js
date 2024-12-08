const rateLimit = require('express-rate-limit');

// Redis store for distributed rate limiting across multiple servers
const RedisStore = require('rate-limit-redis');

/**
 * General API Rate Limiter Configuration
 * Protects against brute force attacks and DoS attempts
 * - 100 requests per 15 minutes per IP
 * - Only counts failed requests to be more lenient with legitimate users
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Request limit per window
  standardHeaders: true, // Use standard rate limit headers
  legacyHeaders: false, // Disable legacy headers
  skipSuccessfulRequests: true, // Only track failed requests
  keyGenerator: (req) => req.ip // Use IP address as rate limit key
});

/**
 * Authentication Rate Limiter
 * More restrictive limits for login attempts to prevent credential stuffing
 * - 20 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration Rate Limiter
 * Prevents mass account creation attempts
 * - 20 registrations per 15 minutes per IP
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimiter,
  authLimiter,
  registerLimiter
}; 