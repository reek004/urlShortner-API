/**
 * URL Controller
 * Handles all HTTP requests for URL operations
 * Features:
 * - URL shortening with custom aliases
 * - QR code generation
 * - URL redirection
 * - Analytics tracking
 * - Bulk URL processing
 * - Access control enforcement
 */
const urlService = require('../services/urlService');
const path = require('path');
const config = require('../config/config');

class UrlController {
  /**
   * Create Short URL
   * POST /urls
   * @param {Object} req.body.longUrl - Original URL to shorten
   * @param {Object} req.body.customAlias - Optional custom alias
   * @param {Object} req.body.expiresIn - Optional expiration time in seconds
   * @returns {Object} Shortened URL details with QR code
   **/
  async shortenUrl(req, res) {
    try {
      const { longUrl, customAlias, expiresIn } = req.body;
      
      // Calculate expiration date if provided
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000);
      }
      
      const url = await urlService.createShortUrl(
        longUrl, 
        customAlias, 
        expiresAt,
        req.user.userId
      );

      // Return URL details with QR code
      res.json({
        shortUrl: url.shortUrl,
        qrCode: url.qrCode, 
        created: url.createdAt,
        expiresAt: url.expiresAt
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Redirect to Original URL
   * GET /:code
   * Handles URL redirection and tracks analytics
   * @param {string} req.params.code - Short URL code
   */
  async redirect(req, res) {
    try {
      const { code } = req.params;
      const url = await urlService.getUrl(code);
      
      // Track click analytics
      await urlService.trackClick(code, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
      });

      res.redirect(url.longUrl);
    } catch (error) {
      res.status(404).json({ error: 'URL not found' });
    }
  }

  /**
   * Get URL Statistics
   * GET /urls/:code/stats
   * Retrieves detailed analytics for a specific URL
   * @param {string} req.params.code - Short URL code
   * @returns {Object} URL statistics and analytics
   */
  async getUrlStats(req, res) {
    try {
      const { code } = req.params;
      const stats = await urlService.getUrlStats(code);
      res.json({
        totalClicks: stats.totalClicks,
        browserStats: stats.browserStats,
        referrerStats: stats.referrerStats,
        clicksByDate: stats.clicksByDate,
        lastClicked: stats.lastClicked,
        averageClicksPerDay: stats.averageClicksPerDay
      });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  /**
   * Create Multiple Short URLs
   * POST /urls/bulk
   * Processes multiple URLs in a single request
   * @param {Array} req.body.urls - Array of URLs to process
   * @returns {Array} Results for each URL
   */
  async createBulkUrls(req, res) {
    try {
      const { urls } = req.body;
      
      // Validate input array
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Invalid URLs array' });
      }
      
      const results = await urlService.createBulkUrls(urls, req.user.userId);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get QR Code
   * GET /urls/:code/qr
   * Retrieves QR code for a specific URL
   * @param {string} req.params.code - Short URL code
   * @returns {Object} QR code and short URL
   */
  async getQrCode(req, res) {
    try {
      const { code } = req.params;
      const url = await urlService.getUrl(code);
      
      if (!url) {
        return res.status(404).json({ error: 'URL not found' });
      }

      res.json({
        qrCode: url.qrCode,
        shortUrl: url.shortUrl
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * List All URLs
   * GET /urls
   * Retrieves all URLs for the authenticated user
   * @returns {Array} List of user's URLs
   */
  async getAllUrls(req, res) {
    try {
      const urls = await urlService.getAllUrls(req.user.userId);
      
      res.json({
        success: true,
        data: urls
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete URL
   * DELETE /urls/:code
   * Removes a URL if owned by the requesting user
   * @param {string} req.params.code - Short URL code
   * @returns {Object} Deletion status
   */
  async deleteUrl(req, res) {
    try {
      const { code } = req.params;
      const url = await urlService.deleteUrl(code, req.user.userId);
      
      if (!url) {
        return res.status(404).json({ 
          status: 'CLIENT_ERROR',
          message: 'No such URL'
        });
      }

      res.json({ 
        status: 'SUCCESS',
        message: 'URL deleted successfully' 
      });
    } catch (error) {
      // Handle specific error cases
      if (error.message === 'No such URL') {
        return res.status(404).json({
          status: 'CLIENT_ERROR',
          message: 'No such URL'
        });
      } else if (error.message === 'Not authorized') {
        return res.status(403).json({
          status: 'AUTH_ERROR',
          message: 'Authorization error'
        });
      }
      
      // Generic error handler
      return res.status(500).json({
        status: 'SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UrlController(); 