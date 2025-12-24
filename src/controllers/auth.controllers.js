const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const {
    HTTP_STATUS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    TOKEN,
    COOKIE_OPTIONS
} = require('../utils/constants');

// ==================== HELPER FUNCTIONS ====================

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN.ACCESS_EXPIRY }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN.REFRESH_EXPIRY }
    );

    return { accessToken, refreshToken };
};

// ==================== CONTROLLERS ====================

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw ApiError.conflict(ERROR_MESSAGES.USER_EXISTS);
    }

    // Create user
    const user = await User.create({ email, password, name });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${email}`);

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.status(HTTP_STATUS.CREATED).json(
        ApiResponse.created(
            {
                user: user.toPublicProfile(),
                accessToken,
                refreshToken
            },
            SUCCESS_MESSAGES.REGISTER_SUCCESS
        )
    );
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (!user.isActive) {
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_INACTIVE);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Cache user session
    await cache.set(
        `session:${user._id}`,
        {
            userId: user._id,
            email: user.email,
            role: user.role
        },
        900
    );

    logger.info(`User logged in: ${email}`);

    // Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.status(HTTP_STATUS.OK).json(
        ApiResponse.ok(
            {
                user: user.toPublicProfile(),
                accessToken,
                refreshToken
            },
            SUCCESS_MESSAGES.LOGIN_SUCCESS
        )
    );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
        throw ApiError.unauthorized('Refresh token required');
    }

    // Verify refresh token
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
        throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID);
    }

    // Find user
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
        throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID);
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new refresh token in cookie
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    res.status(HTTP_STATUS.OK).json(
        ApiResponse.ok({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        })
    );
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Clear refresh token
            await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });

            // Clear cache
            await cache.del(`session:${decoded.userId}`);
        } catch (error) {
            logger.warn('Logout with invalid token');
        }
    }

    // Clear cookie
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.status(HTTP_STATUS.OK).json(
        ApiResponse.ok(null, SUCCESS_MESSAGES.LOGOUT_SUCCESS)
    );
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId);

    if (!user) {
        throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    res.status(HTTP_STATUS.OK).json(
        ApiResponse.ok(user.toPublicProfile())
    );
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
        throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw ApiError.badRequest('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    // Clear cache
    await cache.del(`session:${user._id}`);

    logger.info(`Password changed for user: ${user.email}`);

    res.status(HTTP_STATUS.OK).json(
        ApiResponse.ok(null, 'Password changed successfully')
    );
});

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    getMe,
    changePassword
};