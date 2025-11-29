// src/routes/health.routes.js - Health Check Routes
const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('../config/redis');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.services.mongodb = {
        status: 'healthy',
        responseTime: 'OK'
      };
    } else {
      health.services.mongodb = {
        status: 'unhealthy',
        error: 'Not connected'
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.mongodb = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    if (redisClient.isReady) {
      await redisClient.ping();
      health.services.redis = {
        status: 'healthy',
        responseTime: 'OK'
      };
    } else {
      health.services.redis = {
        status: 'unhealthy',
        error: 'Not connected'
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = redisClient.isReady;

  if (mongoReady && redisReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      mongo: mongoReady,
      redis: redisReady
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

module.exports = router;
