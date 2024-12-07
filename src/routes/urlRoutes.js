const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const auth = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const urlValidator = require('../middleware/urlValidator');

// rate limiting to all routes
router.use(rateLimiter);

// Protected routes
router.get('/urls', auth, urlController.getAllUrls);
router.post('/urls', auth, urlValidator, urlController.shortenUrl);
router.post('/urls/bulk', auth, urlValidator, urlController.createBulkUrls);
router.get('/urls/:code/stats', auth, urlController.getUrlStats);
router.get('/urls/:code/qr', auth, urlController.getQrCode);
router.delete('/urls/:code', auth, urlController.deleteUrl);

// Public route for redirection
router.get('/:code', urlController.redirect);

module.exports = router; 