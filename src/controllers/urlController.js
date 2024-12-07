const urlService = require('../services/urlService');
const config = require('../config/config');

class UrlController {
  async shortenUrl(req, res) {
    try {
      const { longUrl, customAlias, expiresIn } = req.body;
      
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

      // return the qr code as a base64 string
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

  async redirect(req, res) {
    try {
      const { code } = req.params;
      const url = await urlService.getUrl(code);
      
      // Track click
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

  async createBulkUrls(req, res) {
    try {
      const { urls } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Invalid URLs array' });
      }
      
      const results = await urlService.createBulkUrls(urls, req.user.userId);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

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
      
      return res.status(500).json({
        status: 'SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UrlController(); 