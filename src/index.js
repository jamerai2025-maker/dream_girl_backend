// src/index.js - Main Application Entry Point
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const characterRoutes = require('./routes/character.routes');
const characterMediaRoutes = require('./routes/characterMedia.routes');
const attributesRoutes = require('./routes/attributes.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();
const PORT = process.env.PORT || 8088;

// ==================== MIDDLEWARE ====================

// Security
app.use(helmet());
app.use('/assets', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
})
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Cookie Parser (for refresh token)
app.use(cookieParser());

const { apiLimiter, authLimiter } = require('./middleware/rateLimiter.middleware');

// Rate Limiting (Redis-based for distributed systems)
app.use('/api/', apiLimiter); // 100 requests per 15 minutes per IP

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// ==================== STATIC FILES ====================

// Serve static files from public directory
const path = require('path');
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// ==================== ROUTES ====================

// Health check (no /api prefix)
app.use('/health', healthRoutes);

// Queue Monitoring UI (Admin only)
const { serverAdapter } = require('./queues/queueMonitor');
app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/characters', characterRoutes);
app.use('/api/v1/characters', characterMediaRoutes);
app.use('/api/v1/attributes', attributesRoutes);
// app.use('/api/v1/users', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Nova AI API',
    version: '1.0.0',
    docs: '/api/v1/docs'
  });
});

// 404 Handler (after all routes)
app.use(notFound);

// Global Error Handler (must be last)
app.use(errorHandler);

// ==================== SERVER START ====================

let isShuttingDown = false;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Connect to Redis
    await connectRedis.connect();
    logger.info('Redis connected successfully');

    // Initialize background workers
    require('./workers/characterCreation.worker');
    require('./workers/imageGeneration.worker');
    require('./workers/videoGeneration.worker');
    logger.info('Background workers initialized');

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} received. Shutting down gracefully...`);

      // Close server first (stop accepting new connections)
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close Redis connection
          if (connectRedis.isOpen) {
            await connectRedis.quit();
            logger.info('Redis connection closed');
          }

          // Close MongoDB connection
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;