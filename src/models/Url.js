const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  urlCode: {
    type: String,
    required: true,
    unique: true,
  },
  longUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    required: true,
  },
  qrCode: {
    type: String,
    required: true,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  analytics: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String,
    referer: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false
  }
});

// Adding middleware to check expiration
urlSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
  }
  next();
});

module.exports = mongoose.model('Url', urlSchema); 