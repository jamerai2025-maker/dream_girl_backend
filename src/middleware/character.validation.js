// src/middleware/character.validation.js - Character Validation Middleware
const { body, param, query, validationResult } = require('express-validator');

// ==================== VALIDATION HELPERS ====================

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// ==================== CHARACTER VALIDATION RULES ====================

const createCharacterValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Character name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

    body('age')
        .optional()
        .isInt({ min: 18, max: 150 }).withMessage('Age must be between 18 and 150'),

    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['Male', 'Female', 'Non-binary', 'Other']).withMessage('Invalid gender'),

    body('description')
        .optional()
        .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

    body('shortDescription')
        .optional()
        .isLength({ max: 200 }).withMessage('Short description cannot exceed 200 characters'),

    body('style')
        .optional()
        .isIn(['Realistic', 'Anime', 'Cartoon', '3D', 'Fantasy', 'Other']).withMessage('Invalid style'),

    body('bodyType')
        .optional()
        .customSanitizer(value => {
            if (!value) return value;
            const normalized = value.toLowerCase();
            const bodyTypeMap = {
                'slim': 'Slim',
                'athletic': 'Athletic',
                'average': 'Average',
                'curvy': 'Curvy',
                'muscular': 'Muscular',
                'plus-size': 'Plus-size',
                'plussize': 'Plus-size',
                'other': 'Other'
            };
            return bodyTypeMap[normalized] || value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        })
        .isIn(['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Other']).withMessage('Invalid body type'),

    body('breastSize')
        .optional({ checkFalsy: true })
        .customSanitizer(value => {
            if (!value) return undefined;
            const normalized = value.toLowerCase().replace(/[-_\s]/g, '');
            const sizeMap = {
                'small': 'Small',
                's': 'Small',
                'medium': 'Medium',
                'med': 'Medium',
                'm': 'Medium',
                'large': 'Large',
                'l': 'Large',
                'extralarge': 'Extra-large',
                'xl': 'Extra-large',
                'x-large': 'Extra-large'
            };
            // Return undefined for invalid values instead of failing validation
            return sizeMap[normalized] || undefined;
        })
        .custom(value => {
            // Allow undefined or valid sizes
            return !value || ['Small', 'Medium', 'Large', 'Extra-large'].includes(value);
        }).withMessage('Invalid breast size'),

    body('buttSize')
        .optional({ checkFalsy: true })
        .customSanitizer(value => {
            if (!value) return undefined;
            const normalized = value.toLowerCase().replace(/[-_\s]/g, '');
            const sizeMap = {
                'small': 'Small',
                's': 'Small',
                'medium': 'Medium',
                'med': 'Medium',
                'm': 'Medium',
                'large': 'Large',
                'l': 'Large',
                'extralarge': 'Extra-large',
                'xl': 'Extra-large',
                'x-large': 'Extra-large'
            };
            // Return undefined for invalid values instead of failing validation
            return sizeMap[normalized] || undefined;
        })
        .custom(value => {
            // Allow undefined or valid sizes
            return !value || ['Small', 'Medium', 'Large', 'Extra-large'].includes(value);
        }).withMessage('Invalid butt size'),

    body('voice')
        .optional()
        .isIn(['Sultry', 'Sweet', 'Deep', 'Soft', 'Energetic', 'Calm', 'Other']).withMessage('Invalid voice type'),

    body('relationship')
        .optional()
        .isIn(['Friend', 'Coworker', 'Stranger', 'Partner', 'Family', 'Other']).withMessage('Invalid relationship'),

    body('mainCategory')
        .optional()
        .isIn(['Female', 'Male', 'Non-binary', 'Fantasy', 'Anime', 'Other']).withMessage('Invalid main category'),

    body('visibility')
        .optional()
        .isIn(['Public', 'Private', 'Unlisted']).withMessage('Invalid visibility'),

    body('displayImageUrls')
        .optional()
        .isArray().withMessage('Display image URLs must be an array')
        .custom((urls) => urls.length <= 10).withMessage('Cannot have more than 10 display images'),

    body('displayImageUrls.*')
        .optional()
        .isURL().withMessage('Each display image URL must be a valid URL'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((tags) => tags.length <= 20).withMessage('Cannot have more than 20 tags'),

    body('exampleResponses')
        .optional()
        .isArray().withMessage('Example responses must be an array'),

    handleValidationErrors
];

const updateCharacterValidation = [
    param('id')
        .notEmpty().withMessage('Character ID is required'),

    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

    body('age')
        .optional()
        .isInt({ min: 18, max: 150 }).withMessage('Age must be between 18 and 150'),

    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Non-binary', 'Other']).withMessage('Invalid gender'),

    body('style')
        .optional()
        .isIn(['Realistic', 'Anime', 'Cartoon', '3D', 'Fantasy', 'Other']).withMessage('Invalid style'),

    body('visibility')
        .optional()
        .isIn(['Public', 'Private', 'Unlisted']).withMessage('Invalid visibility'),

    body('displayImageUrls')
        .optional()
        .isArray().withMessage('Display image URLs must be an array')
        .custom((urls) => urls.length <= 10).withMessage('Cannot have more than 10 display images'),

    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array')
        .custom((tags) => tags.length <= 20).withMessage('Cannot have more than 20 tags'),

    handleValidationErrors
];

const getCharacterValidation = [
    param('id')
        .notEmpty().withMessage('Character ID is required'),

    handleValidationErrors
];

const queryCharactersValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('gender')
        .optional()
        .isIn(['Male', 'Female', 'Non-binary', 'Other']).withMessage('Invalid gender'),

    query('style')
        .optional()
        .isIn(['Realistic', 'Anime', 'Cartoon', '3D', 'Fantasy', 'Other']).withMessage('Invalid style'),

    query('mainCategory')
        .optional()
        .isIn(['Female', 'Male', 'Non-binary', 'Fantasy', 'Anime', 'Other']).withMessage('Invalid main category'),

    query('visibility')
        .optional()
        .isIn(['Public', 'Private', 'Unlisted']).withMessage('Invalid visibility'),

    query('sort')
        .optional()
        .isIn(['createdAt', '-createdAt', 'likeCount', '-likeCount', 'messageCount', '-messageCount', 'name', '-name']).withMessage('Invalid sort field'),

    query('search')
        .optional()
        .isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),

    handleValidationErrors
];

// ==================== CHARACTER MEDIA VALIDATION RULES ====================

const uploadMediaValidation = [
    param('characterId')
        .notEmpty().withMessage('Character ID is required'),

    body('mediaType')
        .notEmpty().withMessage('Media type is required')
        .isIn(['image', 'video']).withMessage('Media type must be image or video'),

    body('mediaUrl')
        .notEmpty().withMessage('Media URL is required')
        .isURL().withMessage('Media URL must be a valid URL'),

    body('thumbnailUrl')
        .optional()
        .isURL().withMessage('Thumbnail URL must be a valid URL'),

    body('prompt')
        .optional()
        .isLength({ max: 1000 }).withMessage('Prompt cannot exceed 1000 characters'),

    body('width')
        .optional()
        .isInt({ min: 0 }).withMessage('Width must be a positive integer'),

    body('height')
        .optional()
        .isInt({ min: 0 }).withMessage('Height must be a positive integer'),

    body('duration')
        .optional()
        .isFloat({ min: 0 }).withMessage('Duration must be a positive number'),

    handleValidationErrors
];

const getMediaValidation = [
    param('characterId')
        .notEmpty().withMessage('Character ID is required'),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('mediaType')
        .optional()
        .isIn(['image', 'video']).withMessage('Media type must be image or video'),

    handleValidationErrors
];

const promoteMediaValidation = [
    param('characterId')
        .notEmpty().withMessage('Character ID is required'),

    param('mediaId')
        .notEmpty().withMessage('Media ID is required'),

    handleValidationErrors
];

module.exports = {
    createCharacterValidation,
    updateCharacterValidation,
    getCharacterValidation,
    queryCharactersValidation,
    uploadMediaValidation,
    getMediaValidation,
    promoteMediaValidation
};
