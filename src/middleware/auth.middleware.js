const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { cache } = require('../config/redis');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * @desc    Authenticate user via JWT token
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Debug logging
  console.log('🔐 Auth Debug:', {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
    headers: Object.keys(req.headers)
  });

  // Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No valid auth header found');
    throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];
  console.log('🎫 Token extracted:', token.substring(0, 20) + '...');

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { userId: decoded.userId });

    // Check cache first for performance
    const cachedSession = await cache.get(`session:${decoded.userId}`);

    if (cachedSession) {
      console.log('✅ Session found in cache:', cachedSession);

      // Ensure _id field exists (for backward compatibility with old cached sessions)
      if (!cachedSession._id && cachedSession.userId) {
        cachedSession._id = cachedSession.userId;
      }

      req.user = cachedSession;
      console.log('✅ req.user set to:', req.user);
    } else {
      console.log('📥 Fetching user from database');
      // Fetch from DB if not in cache
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log('❌ User not found:', decoded.userId);
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      if (!user.isActive) {
        console.log('❌ User inactive:', decoded.userId);
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_INACTIVE);
      }

      req.user = {
        userId: user._id,
        _id: user._id, // For backward compatibility
        email: user.email,
        role: user.role
      };

      console.log('✅ User authenticated:', { userId: user._id, email: user.email });

      // Cache session for 15 minutes
      await cache.set(`session:${user._id}`, req.user, 900);
    }

    next();
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED);
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID);
    }
    throw error;
  }
});

/**
 * @desc    Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cachedSession = await cache.get(`session:${decoded.userId}`);

    if (cachedSession) {
      req.user = cachedSession;
    } else {
      const user = await User.findById(decoded.userId);
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          _id: user._id, // For backward compatibility
          email: user.email,
          role: user.role
        };
      }
    }
  } catch (error) {
    // Ignore errors - optional auth
  }

  next();
});

/**
 * @desc    Restrict access to specific roles
 * @usage   authorize('admin', 'moderator')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    next();
  };
};

/**
 * @desc    Check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (req.user.role !== 'admin') {
    throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
  }

  next();
};

/**
 * @desc    Check if user owns the resource or is admin
 * @usage   isOwnerOrAdmin('userId')
 */
const isOwnerOrAdmin = (paramField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const resourceUserId = req.params[paramField];
    const isOwner = req.user.userId.toString() === resourceUserId;
    const isAdminUser = req.user.role === 'admin';

    if (!isOwner && !isAdminUser) {
      throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  isAdmin,
  isOwnerOrAdmin
};