const rateLimit = require('express-rate-limit');

/**
 * Memory-based Rate Limiting Middleware
 * 
 * Note: This uses in-memory storage. For distributed systems across multiple servers,
 * consider using rate-limit-redis with proper Redis connection handling.
 * 
 * Current implementation provides:
 * - Per-user rate limiting (using userId from req.user)
 * - Different limits for different route types
 * - Automatic cleanup of old entries
 */

// ==================== GENERAL API RATE LIMITER ====================
// 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
});

// ==================== AUTH RATE LIMITER ====================
// 5 requests per 15 minutes per IP (strict for login/register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many authentication attempts, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true // Don't count successful requests
});

// ==================== CREATE CHARACTER RATE LIMITER ====================
// 5 requests per minute PER USER
const createCharacterLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,

    // Key generator: Use userId instead of IP
    keyGenerator: (req) => {
        // If user is authenticated, use their userId
        if (req.user && req.user._id) {
            return `user:${req.user._id}`;
        }
        // Fallback to IP if not authenticated
        return req.ip;
    },

    message: {
        success: false,
        statusCode: 429,
        message: 'You can only create 5 characters per minute. Please wait before creating more.'
    },

    // Custom handler for better error response
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: 'You can only create 5 characters per minute. Please wait before creating more.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) // seconds until reset
        });
    }
});

// ==================== UPDATE CHARACTER RATE LIMITER ====================
// 10 requests per minute PER USER
const updateCharacterLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
        if (req.user && req.user._id) {
            return `user:${req.user._id}`;
        }
        return req.ip;
    },

    message: {
        success: false,
        statusCode: 429,
        message: 'You can only update 10 characters per minute. Please wait.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    createCharacterLimiter,
    updateCharacterLimiter
};
