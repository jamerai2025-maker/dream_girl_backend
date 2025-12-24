// src/routes/character.routes.js - Character Routes
const express = require('express');
const router = express.Router();

const {
    createCharacter,
    getAllCharacters,
    getCharacterById,
    updateCharacter,
    deleteCharacter,
    getMyCharacters,
    getFeaturedCharacters,
    getTrendingCharacters,
    incrementMessageCount,
    generateImageForCharacter,
    generateVideoForCharacter,
    // Queue-based character creation
    createCharacterAsync,
    getCharacterJobStatus,
    getMyCharacterJobs,
    cancelCharacterJob,
    // Queue-based media generation
    generateImageAsync,
    generateVideoAsync,
    getMediaGenerationJobStatus,
    getMyMediaJobs
} = require('../controllers/character.controllers');

const {
    createCharacterValidation,
    updateCharacterValidation,
    getCharacterValidation,
    queryCharactersValidation
} = require('../middleware/character.validation');

const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { createCharacterLimiter, updateCharacterLimiter } = require('../middleware/rateLimiter.middleware');

// ==================== PUBLIC ROUTES ====================

// Get all characters (with optional auth for filtering)
router.get('/', optionalAuth, queryCharactersValidation, getAllCharacters);

// Get featured characters
router.get('/featured', getFeaturedCharacters);

// Get trending characters
router.get('/trending', getTrendingCharacters);

// Get single character (with optional auth for private access)
router.get('/:id', optionalAuth, getCharacterValidation, getCharacterById);

// ==================== PROTECTED ROUTES ====================

// Get my characters
router.get('/my/all', authenticate, getMyCharacters);

// Create character (5 requests per minute per user)
router.post('/', authenticate, createCharacterLimiter, createCharacterValidation, createCharacter);

// Update character (10 requests per minute per user)
router.put('/:id', authenticate, updateCharacterLimiter, updateCharacterValidation, updateCharacter);

// Delete character
router.delete('/:id', authenticate, getCharacterValidation, deleteCharacter);

// Increment message count
router.post('/:id/message', authenticate, getCharacterValidation, incrementMessageCount);

// Generate image for character
router.post('/:id/generate-image', authenticate, getCharacterValidation, generateImageForCharacter);

// Generate video from character image
router.post('/:id/media/:mediaId/generate-video', authenticate, generateVideoForCharacter);

// ==================== QUEUE-BASED ROUTES ====================

// Create character asynchronously (queue-based)
router.post('/queue', authenticate, createCharacterLimiter, createCharacterValidation, createCharacterAsync);

// Get job status
router.get('/jobs/:jobId', authenticate, getCharacterJobStatus);

// Get all my jobs
router.get('/jobs', authenticate, getMyCharacterJobs);

// Cancel a job
router.delete('/jobs/:jobId', authenticate, cancelCharacterJob);

// Generate image asynchronously
router.post('/:id/generate-image/queue', authenticate, generateImageAsync);

// Generate video asynchronously
router.post('/:id/media/:mediaId/generate-video/queue', authenticate, generateVideoAsync);

// Get media generation job status
router.get('/media-jobs/:jobId', authenticate, getMediaGenerationJobStatus);

// Get all my media jobs
router.get('/media-jobs', authenticate, getMyMediaJobs);

module.exports = router;
