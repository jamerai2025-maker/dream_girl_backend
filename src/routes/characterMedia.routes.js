// src/routes/characterMedia.routes.js - Character Media Routes
const express = require('express');
const router = express.Router();

const {
    uploadMedia,
    getCommunityMedia,
    getPersonalMedia,
    promoteMediaToCommunity,
    deleteMedia,
    getMediaStats,
    getAllMedia
} = require('../controllers/characterMedia.controllers');

const {
    uploadMediaValidation,
    getMediaValidation,
    promoteMediaValidation
} = require('../middleware/character.validation');

const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// ==================== PUBLIC ROUTES ====================

// Get community media for a character
router.get('/:characterId/media/community', getMediaValidation, getCommunityMedia);

// Get media stats (with optional auth for personal stats)
router.get('/:characterId/media/stats', optionalAuth, getMediaStats);

// ==================== PROTECTED ROUTES ====================

// Get all media for a character (images + videos)
router.get('/:characterId/media', authenticate, getAllMedia);

// Upload media (personal)
router.post('/:characterId/media', authenticate, uploadMediaValidation, uploadMedia);

// Get personal media
router.get('/:characterId/media/personal', authenticate, getMediaValidation, getPersonalMedia);

// Promote media to community (character owner only)
router.post('/:characterId/media/:mediaId/promote', authenticate, promoteMediaValidation, promoteMediaToCommunity);

// Delete media
router.delete('/:characterId/media/:mediaId', authenticate, promoteMediaValidation, deleteMedia);

module.exports = router;
