const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const Url = require('../models/Url');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class UrlService {
  constructor() {
    this.cache = new Map();
  }

  async createShortUrl(longUrl, customAlias, expiresAt, userId) {
    try {
      const urlCode = customAlias || nanoid(8);
      
      // Validate custom alias format
      if (customAlias && !/^[a-zA-Z0-9-_]+$/.test(customAlias)) {
        throw new Error('Custom alias can only contain letters, numbers, hyphens, and underscores');
      }

      // Check if custom alias is already taken
      if (customAlias) {
        const existing = await Url.findOne({ urlCode: customAlias });
        if (existing) {
          throw new Error('Custom alias already in use');
        }
      }

      const shortUrl = `${config.baseUrl}/${urlCode}`;
      
     
      const qrCode = await QRCode.toDataURL(shortUrl);
      
      const url = new Url({
        urlCode,
        longUrl,
        shortUrl,
        qrCode,
        expiresAt,
        userId
      });

      await url.save();
      this.cache.set(urlCode, url);
      return url;
    } catch (error) {
      throw new Error(`Error creating short URL: ${error.message}`);
    }
  }

  async getUrl(urlCode) {
    try {
      // Check cache first
      if (this.cache.has(urlCode)) {
        const cachedUrl = this.cache.get(urlCode);
        if (!cachedUrl.isExpired && (!cachedUrl.expiresAt || new Date() < cachedUrl.expiresAt)) {
          return cachedUrl;
        }
        this.cache.delete(urlCode);
      }

      const url = await Url.findOne({ urlCode });
      if (!url) {
        throw new Error('URL not found');
      }

      if (url.isExpired || (url.expiresAt && new Date() > url.expiresAt)) {
        url.isExpired = true;
        await url.save();
        throw new Error('URL has expired');
      }

      // Update cache
      this.cache.set(urlCode, url);
      return url;
    } catch (error) {
      throw new Error(`Error retrieving URL: ${error.message}`);
    }
  }

  async trackClick(urlCode, reqData) {
    try {
      const url = await Url.findOneAndUpdate(
        { urlCode },
        {
          $inc: { clicks: 1 },
          $push: {
            analytics: {
              timestamp: new Date(),
              ipAddress: reqData.ip,
              userAgent: reqData.userAgent,
              referer: reqData.referer
            }
          }
        },
        { new: true }
      );

      if (url) {
        // Update cache
        this.cache.set(urlCode, url);
      }

      return url;
    } catch (error) {
      throw new Error(`Error tracking click: ${error.message}`);
    }
  }

  async getUrlStats(urlCode) {
    try {
      const url = await Url.findOne({ urlCode });
      if (!url) {
        throw new Error('URL not found');
      }

      // Aggregate analytics data
      const analytics = {
        totalClicks: url.clicks,
        browserStats: {},
        referrerStats: {},
        clicksByDate: {},
        lastClicked: null,
        averageClicksPerDay: 0
      };

      if (url.analytics.length > 0) {
        analytics.lastClicked = url.analytics[url.analytics.length - 1].timestamp;
        
        // Calculate average clicks per day
        const firstClick = url.analytics[0].timestamp;
        const daysSinceCreation = Math.max(1, Math.ceil(
          (new Date() - firstClick) / (1000 * 60 * 60 * 24)
        ));
        analytics.averageClicksPerDay = (url.clicks / daysSinceCreation).toFixed(2);
      }

      url.analytics.forEach(click => {
        // Browser stats
        const browser = this.getBrowserFromUserAgent(click.userAgent);
        analytics.browserStats[browser] = (analytics.browserStats[browser] || 0) + 1;

        // Referrer stats
        const referrer = click.referer || 'Direct';
        analytics.referrerStats[referrer] = (analytics.referrerStats[referrer] || 0) + 1;

        // Clicks by date
        const date = click.timestamp.toISOString().split('T')[0];
        analytics.clicksByDate[date] = (analytics.clicksByDate[date] || 0) + 1;
      });

      // Sort clicksByDate chronologically
      analytics.clicksByDate = Object.fromEntries(
        Object.entries(analytics.clicksByDate).sort()
      );

      return analytics;
    } catch (error) {
      throw new Error(`Error getting URL stats: ${error.message}`);
    }
  }

  getBrowserFromUserAgent(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  async createBulkUrls(urls, userId) {
    const results = [];
    
    for (const url of urls) {
      try {
        const shortUrl = await this.createShortUrl(
          url.longUrl, 
          url.customAlias, 
          url.expiresAt, 
          userId
        );
        results.push({
          success: true,
          originalUrl: url.longUrl,
          shortUrl: shortUrl.shortUrl
        });
      } catch (error) {
        results.push({
          success: false,
          originalUrl: url.longUrl,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async getAllUrls(userId) {
    try {
      const urls = await Url.find({ userId })
        .select('urlCode longUrl shortUrl clicks createdAt expiresAt')
        .sort({ createdAt: -1 });
      
      return urls;
    } catch (error) {
      throw new Error('Error fetching URLs');
    }
  }

  async deleteUrl(urlCode, userId) {
    try {
      const url = await Url.findOne({ urlCode });
      
      if (!url) {
        throw new Error('No such URL');
      }

      // Convert both IDs to strings for comparison
      const urlUserId = url.userId.toString();
      const requestUserId = userId.toString();

    

      // Compare the string versions
      if (urlUserId !== requestUserId) {
        throw new Error('Not authorized');
      }

      await url.deleteOne();
      return url;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UrlService(); 