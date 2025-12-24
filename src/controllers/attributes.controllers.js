// src/controllers/attributes.controllers.js - Character Attributes Controller

const CharacterOccupation = require('../models/CharacterOccupation.model');
const CharacterHobby = require('../models/CharacterHobby.model');
const CharacterRelationship = require('../models/CharacterRelationship.model');
const CharacterFetish = require('../models/CharacterFetish.model');
const CharacterPose = require('../models/CharacterPose.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all occupations
 * @route   GET /api/v1/attributes/occupations
 * @access  Public
 */
exports.getAllOccupations = asyncHandler(async (req, res) => {
    const occupations = await CharacterOccupation.find().sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: occupations.length,
        data: occupations
    });
});

/**
 * @desc    Get all hobbies
 * @route   GET /api/v1/attributes/hobbies
 * @access  Public
 */
exports.getAllHobbies = asyncHandler(async (req, res) => {
    const hobbies = await CharacterHobby.find().sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: hobbies.length,
        data: hobbies
    });
});

/**
 * @desc    Get all relationships
 * @route   GET /api/v1/attributes/relationships
 * @access  Public
 */
exports.getAllRelationships = asyncHandler(async (req, res) => {
    const relationships = await CharacterRelationship.find().sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: relationships.length,
        data: relationships
    });
});

/**
 * @desc    Get all fetishes
 * @route   GET /api/v1/attributes/fetishes
 * @access  Public
 */
exports.getAllFetishes = asyncHandler(async (req, res) => {
    const fetishes = await CharacterFetish.find().sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: fetishes.length,
        data: fetishes
    });
});

/**
 * @desc    Get single occupation by ID
 * @route   GET /api/v1/attributes/occupations/:id
 * @access  Public
 */
exports.getOccupationById = asyncHandler(async (req, res) => {
    const occupation = await CharacterOccupation.findById(req.params.id);

    if (!occupation) {
        throw ApiError.notFound('Occupation not found');
    }

    res.status(200).json({
        success: true,
        data: occupation
    });
});

/**
 * @desc    Get single hobby by ID
 * @route   GET /api/v1/attributes/hobbies/:id
 * @access  Public
 */
exports.getHobbyById = asyncHandler(async (req, res) => {
    const hobby = await CharacterHobby.findById(req.params.id);

    if (!hobby) {
        throw ApiError.notFound('Hobby not found');
    }

    res.status(200).json({
        success: true,
        data: hobby
    });
});

/**
 * @desc    Get single relationship by ID
 * @route   GET /api/v1/attributes/relationships/:id
 * @access  Public
 */
exports.getRelationshipById = asyncHandler(async (req, res) => {
    const relationship = await CharacterRelationship.findById(req.params.id);

    if (!relationship) {
        throw ApiError.notFound('Relationship not found');
    }

    res.status(200).json({
        success: true,
        data: relationship
    });
});

/**
 * @desc    Get single fetish by ID
 * @route   GET /api/v1/attributes/fetishes/:id
 * @access  Public
 */
exports.getFetishById = asyncHandler(async (req, res) => {
    const fetish = await CharacterFetish.findById(req.params.id);

    if (!fetish) {
        throw ApiError.notFound('Fetish not found');
    }

    res.status(200).json({
        success: true,
        data: fetish
    });
});

/**
 * @desc    Get all poses
 * @route   GET /api/v1/attributes/poses
 * @access  Public
 */
exports.getAllPoses = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const filter = {};
    if (category) {
        filter.category = category;
    }

    const poses = await CharacterPose.find(filter).sort({ category: 1, name: 1 });

    // Group by category
    const groupedPoses = poses.reduce((acc, pose) => {
        if (!acc[pose.category]) {
            acc[pose.category] = [];
        }
        acc[pose.category].push(pose);
        return acc;
    }, {});

    res.status(200).json({
        success: true,
        count: poses.length,
        data: poses,
        grouped: groupedPoses
    });
});
