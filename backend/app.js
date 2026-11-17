require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const listingRoutes = require('./routes/listing.routes');
const messageRoutes = require('./routes/message.routes');

// Import error handling middleware
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Connect to MongoDB only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://10.203.192.118:3000',  // Your computer's IP for mobile access
    'http://localhost:3000',    // Local development
    'http://127.0.0.1:3000'     // Alternative localhost
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);

// Welcome endpoint for root path
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to TradeUp Marketplace API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth (register, login)',
      listings: '/api/listings (GET, POST)',
      messages: '/api/messages (GET, POST)'
    },
    documentation: 'See README.md for full API documentation',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TradeUp API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    details: { path: req.originalUrl, method: req.method }
  });
});

// Use the comprehensive error handler
app.use(errorHandler);

module.exports = app;