// src/routes/attributes.routes.js - Character Attributes Routes

const express = require('express');
const router = express.Router();
const attributesController = require('../controllers/attributes.controllers');

// ==================== PUBLIC ROUTES ====================

// Get all attributes
router.get('/occupations', attributesController.getAllOccupations);
router.get('/hobbies', attributesController.getAllHobbies);
router.get('/relationships', attributesController.getAllRelationships);
router.get('/fetishes', attributesController.getAllFetishes);
router.get('/poses', attributesController.getAllPoses);

// Get single attribute by ID
router.get('/occupations/:id', attributesController.getOccupationById);
router.get('/hobbies/:id', attributesController.getHobbyById);
router.get('/relationships/:id', attributesController.getRelationshipById);
router.get('/fetishes/:id', attributesController.getFetishById);

module.exports = router;
