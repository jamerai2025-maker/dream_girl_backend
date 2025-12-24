// src/routes/user.routes.js
const express = require('express');
const User = require('../models/User.model');
const { cache } = require('../config/redis');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

const router = express.Router();

// ==================== GET ALL USERS ====================
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const cacheKey = `users:page:${page}:limit:${limit}`;

  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    logger.debug('Users fetched from cache');
    return res.status(HTTP_STATUS.OK).json(ApiResponse.ok(cachedData));
  }

  const [users, total] = await Promise.all([
    User.find({ isActive: true })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
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

  await cache.set(cacheKey, response, 300);
  res.status(HTTP_STATUS.OK).json(ApiResponse.ok(response));
}));

// ==================== GET SINGLE USER ====================
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `user:${id}`;

  const cachedUser = await cache.get(cacheKey);
  if (cachedUser) {
    return res.status(HTTP_STATUS.OK).json(ApiResponse.ok(cachedUser));
  }

  const user = await User.findById(id).select('-password -refreshToken').lean();

  if (!user) {
    throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  await cache.set(cacheKey, user, 600);
  res.status(HTTP_STATUS.OK).json(ApiResponse.ok(user));
}));

// ==================== UPDATE USER ====================
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.password;
  delete updates.role;
  delete updates.refreshToken;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  if (!user) {
    throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  await cache.del(`user:${id}`);
  await cache.delPattern('users:page:*');

  res.status(HTTP_STATUS.OK).json(ApiResponse.ok(user, SUCCESS_MESSAGES.USER_UPDATED));
}));

// ==================== DELETE USER ====================
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  await cache.del(`user:${id}`);
  await cache.delPattern('users:page:*');

  res.status(HTTP_STATUS.OK).json(ApiResponse.ok(null, SUCCESS_MESSAGES.USER_DELETED));
}));

// ==================== SEARCH USERS ====================
router.get('/search/:query', authenticate, asyncHandler(async (req, res) => {
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

  res.status(HTTP_STATUS.OK).json(ApiResponse.ok({ users }));
}));

module.exports = router;