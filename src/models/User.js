/**
 * User Model Schema
 * Defines the structure for user data storage
 * Features:
 * - Email validation
 * - Password hashing
 * - API key management
 * - Timestamp tracking
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    // Email format validation
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    // Don't return password in queries by default
    select: false
  },
  apiKey: {
    type: String,
    unique: true,
    // Don't return API key in queries by default
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Used for account age tracking
    immutable: true
  },
  lastLogin: {
    type: Date,
    // Track user activity
    default: null
  }
});

/**
 * Pre-save middleware
 * Automatically hashes password before saving
 * Only hashes if password is modified
 */
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (this.isModified('password')) {
    try {
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

/**
 * Instance method to compare passwords
 * Returns boolean indicating if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

module.exports = mongoose.model('User', userSchema); 