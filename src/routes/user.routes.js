// src/routes/user.routes.js - User Routes with Caching
const express = require('express');
const User = require('../models/User.model');
const { cache } = require('../config/redis');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== GET ALL USERS (with pagination & caching) ====================
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Cache key based on query params
    const cacheKey = `users:page:${page}:limit:${limit}`;

    // Check cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      logger.debug('Users fetched from cache');
      return res.json(cachedData);
    }

    // Query database
    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      User.countDocuments({ isActive: true })
    ]);

    const response = {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    res.json(response);

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ==================== GET SINGLE USER ====================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `user:${id}`;

    // Check cache
    const cachedUser = await cache.get(cacheKey);
    if (cachedUser) {
      return res.json(cachedUser);
    }

    const user = await User.findById(id).select('-password -refreshToken').lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cache for 10 minutes
    await cache.set(cacheKey, user, 600);

    res.json(user);

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ==================== UPDATE USER ====================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.password;
    delete updates.role;
    delete updates.refreshToken;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate cache
    await cache.del(`user:${id}`);
    await cache.delPattern('users:page:*');

    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ==================== DELETE USER (Soft Delete) ====================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate cache
    await cache.del(`user:${id}`);
    await cache.delPattern('users:page:*');

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==================== SEARCH USERS ====================
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find(
      { $text: { $search: query }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .select('-password -refreshToken')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ users });

  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
