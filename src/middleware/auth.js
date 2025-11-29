// src/middleware/auth.js - Authentication Middleware
const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const User = require('../models/User.model');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check cache first for user session
    let user = await cache.get(`session:${decoded.userId}`);

    if (!user) {
      // If not in cache, get from database
      user = await User.findById(decoded.userId).select('-password -refreshToken').lean();
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Cache the session
      await cache.set(`session:${decoded.userId}`, user, 900);
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    next();
  };
};

module.exports = authMiddleware;
module.exports.authorize = authorize;
