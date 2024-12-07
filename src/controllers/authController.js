const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');

class AuthController {
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Validate request body
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Normalize email first
      const normalizedEmail = email.trim().toLowerCase();

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Generate API key
      const apiKey = crypto.randomBytes(32).toString('hex');

      // Create new user with normalized email
      const user = new User({
        email: normalizedEmail,
        password,
        apiKey
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        apiKey
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token with proper user info
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        apiKey: user.apiKey
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async refreshApiKey(req, res) {
    try {
      const newApiKey = crypto.randomBytes(32).toString('hex');
      
      await User.findByIdAndUpdate(req.user.userId, {
        apiKey: newApiKey
      });

      res.json({
        message: 'API key refreshed successfully',
        apiKey: newApiKey
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AuthController(); 