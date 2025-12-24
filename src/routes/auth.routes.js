const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controllers');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// ==================== VALIDATION RULES ====================

const registerValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name 2-100 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password min 8 characters')
];

// ==================== ROUTES ====================

// Public (with strict rate limiting to prevent brute force)
router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/refresh', authController.refreshAccessToken);
router.post('/logout', authController.logout);

// Private
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);

module.exports = router;