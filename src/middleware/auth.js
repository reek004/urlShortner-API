const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Check for JWT token
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = {
        userId: decoded.userId, 
        email: decoded.email
      };
      return next();
    }

    // Check for API key
    const apiKey = req.header('X-API-Key');
    if (apiKey) {
      const user = await User.findOne({ apiKey });
      if (user) {
        req.user = { userId: user._id };
        return next();
      }
      return res.status(401).json({ error: 'Invalid API key' });
    }

    res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

module.exports = auth; 