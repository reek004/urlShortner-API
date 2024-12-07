const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Protected routes
router.post('/refresh-api-key', auth, authController.refreshApiKey);

module.exports = router; 