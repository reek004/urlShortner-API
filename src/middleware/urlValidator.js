const { isURL } = require('validator');

const urlValidator = (req, res, next) => {
  // Handle bulk URL creation
  if (req.path === '/urls/bulk') {
    const { urls } = req.body;
    
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs must be provided as an array' });
    }

    // Validate each URL in the array
    for (const urlObj of urls) {
      if (!urlObj.longUrl || !isURL(urlObj.longUrl, { require_protocol: true })) {
        return res.status(400).json({ 
          error: 'Invalid URL format',
          invalidUrl: urlObj.longUrl 
        });
      }
      // Sanitize URL
      urlObj.longUrl = encodeURI(urlObj.longUrl);
    }
  } else {
    // Handle single URL creation
    const { longUrl } = req.body;
    
    if (!longUrl || !isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Sanitize URL
    req.body.longUrl = encodeURI(longUrl);
  }
  
  next();
};

module.exports = urlValidator; 