const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

const urlRoutes = require('./routes/urlRoutes');
const authRoutes = require('./routes/authRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/', urlRoutes);

// MongoDB connection
const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  };

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;       