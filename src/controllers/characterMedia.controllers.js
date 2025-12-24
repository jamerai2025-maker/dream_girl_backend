const Character = require('../models/Character.model');
const CharacterMedia = require('../models/CharacterMedia.model');
const logger = require('../utils/logger');

/**
 * @desc    Upload media for a character (personal gallery)
 * @route   POST /api/v1/characters/:characterId/media
 * @access  Private
 */
const uploadMedia = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { mediaType, mediaUrl, thumbnailUrl, prompt, width, height, duration, generationParams } = req.body;

        // Check if character exists
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Create media
        const media = await CharacterMedia.create({
            characterId: character._id,
            userId: req.user._id,
            mediaType,
            mediaUrl,
            thumbnailUrl,
            prompt,
            width,
            height,
            duration,
            generationParams,
            visibility: 'personal' // Always start as personal
        });

        logger.info(`Media uploaded: ${media._id} for character: ${character._id} by user: ${req.user._id}`);

        res.status(201).json({
            success: true,
            statusCode: 201,
            message: 'Media uploaded successfully',
            data: media
        });
    } catch (error) {
        logger.error('Error uploading media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error uploading media',
            error: error.message
        });
    }
};

/**
 * @desc    Get community media for a character
 * @route   GET /api/v1/characters/:characterId/media/community
 * @access  Public
 */
const getCommunityMedia = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { page = 1, limit = 20, mediaType, sort = '-createdAt' } = req.query;

        // Check if character exists
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Build filter
        const filter = {
            characterId: character._id,
            visibility: 'community',
            isApproved: true,
            deletedAt: null
        };

        if (mediaType) {
            filter.mediaType = mediaType;
        }

        // Get media
        const media = await CharacterMedia.find(filter)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('userId', 'name avatar')
            .lean();

        const total = await CharacterMedia.countDocuments(filter);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Community media retrieved successfully',
            data: media,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error getting community media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving community media',
            error: error.message
        });
    }
};

/**
 * @desc    Get personal media for a character (user's own)
 * @route   GET /api/v1/characters/:characterId/media/personal
 * @access  Private
 */
const getPersonalMedia = async (req, res) => {
    try {
        const { characterId } = req.params;
        const { page = 1, limit = 20, mediaType, sort = '-createdAt' } = req.query;

        // Check if character exists
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Build filter
        const filter = {
            characterId: character._id,
            userId: req.user._id,
            visibility: 'personal',
            deletedAt: null
        };

        if (mediaType) {
            filter.mediaType = mediaType;
        }

        // Get media
        const media = await CharacterMedia.find(filter)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await CharacterMedia.countDocuments(filter);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Personal media retrieved successfully',
            data: media,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error getting personal media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving personal media',
            error: error.message
        });
    }
};

/**
 * @desc    Promote media to community (character owner only)
 * @route   POST /api/v1/characters/:characterId/media/:mediaId/promote
 * @access  Private (Character Owner)
 */
const promoteMediaToCommunity = async (req, res) => {
    try {
        const { characterId, mediaId } = req.params;

        // Check if character exists and user is owner
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Check ownership
        const isOwner = character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'Only the character owner can promote media to community'
            });
        }

        // Find media
        const media = await CharacterMedia.findOne({
            _id: mediaId,
            characterId: character._id,
            deletedAt: null
        });

        if (!media) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Media not found'
            });
        }

        // Promote to community
        await media.promoteToCommunity(req.user._id);

        logger.info(`Media promoted to community: ${media._id} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Media promoted to community successfully',
            data: media
        });
    } catch (error) {
        logger.error('Error promoting media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error promoting media',
            error: error.message
        });
    }
};

/**
 * @desc    Delete media
 * @route   DELETE /api/v1/characters/:characterId/media/:mediaId
 * @access  Private (Media Owner or Character Owner or Admin)
 */
const deleteMedia = async (req, res) => {
    try {
        const { characterId, mediaId } = req.params;

        // Check if character exists
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Find media
        const media = await CharacterMedia.findOne({
            _id: mediaId,
            characterId: character._id,
            deletedAt: null
        });

        if (!media) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Media not found'
            });
        }

        // Check permissions
        const isMediaOwner = media.userId.toString() === req.user._id.toString();
        const isCharacterOwner = character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isMediaOwner && !isCharacterOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'You do not have permission to delete this media'
            });
        }

        // Soft delete
        await media.softDelete();

        logger.info(`Media deleted: ${media._id} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Media deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error deleting media',
            error: error.message
        });
    }
};

/**
 * @desc    Get media statistics for a character
 * @route   GET /api/v1/characters/:characterId/media/stats
 * @access  Public
 */
const getMediaStats = async (req, res) => {
    try {
        const { characterId } = req.params;

        // Check if character exists
        const character = await Character.findByIdOrDisplayId(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Get stats
        const stats = await CharacterMedia.countByType(character._id);

        // Format stats
        const formattedStats = {
            community: {
                images: 0,
                videos: 0,
                total: 0
            },
            personal: {
                images: 0,
                videos: 0,
                total: 0
            }
        };

        stats.forEach(stat => {
            const visibility = stat._id.visibility;
            const mediaType = stat._id.mediaType;
            formattedStats[visibility][`${mediaType}s`] = stat.count;
            formattedStats[visibility].total += stat.count;
        });

        // If user is authenticated, get their personal stats
        if (req.user) {
            const userStats = await CharacterMedia.countByType(character._id, req.user._id);
            formattedStats.myPersonal = {
                images: 0,
                videos: 0,
                total: 0
            };

            userStats.forEach(stat => {
                if (stat._id.visibility === 'personal') {
                    const mediaType = stat._id.mediaType;
                    formattedStats.myPersonal[`${mediaType}s`] = stat.count;
                    formattedStats.myPersonal.total += stat.count;
                }
            });
        }

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Media statistics retrieved successfully',
            data: formattedStats
        });
    } catch (error) {
        logger.error('Error getting media stats:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving media statistics',
            error: error.message
        });
    }
};

/**
 * @desc    Get all media for a character (personal + community)
 * @route   GET /api/v1/characters/:characterId/media
 * @access  Private
 */
const getAllMedia = async (req, res) => {
    try {
        const { characterId } = req.params;

        // Get all media for this character that belongs to the user
        const media = await CharacterMedia.find({
            characterId,
            userId: req.user._id,
            deletedAt: null
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Media retrieved successfully',
            data: {
                total: media.length,
                images: media.filter(m => m.mediaType === 'image').length,
                videos: media.filter(m => m.mediaType === 'video').length,
                media
            }
        });

    } catch (error) {
        logger.error('Error getting all media:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving media',
            error: error.message
        });
    }
};

module.exports = {
    uploadMedia,
    getCommunityMedia,
    getPersonalMedia,
    promoteMediaToCommunity,
    deleteMedia,
    getMediaStats,
    getAllMedia
};
