const Character = require('../models/Character.model');
const CharacterMedia = require('../models/CharacterMedia.model');
const CharacterStatistics = require('../models/CharacterStatistics.model');
const CharacterPersonality = require('../models/CharacterPersonality.model');
const logger = require('../utils/logger');
const { createLinkedDocuments, populateCharacter, flattenCharacterData } = require('../utils/characterHelper');
const { generateCharacterImage } = require('../services/aiImageGeneration.service');
const { generatePersonalityDetails } = require('../services/aiPersonality.service');


const createCharacter = async (req, res) => {
    try {
        // Create main character document
        const characterData = {
            name: req.body.name,
            age: req.body.age,
            gender: req.body.gender,
            description: req.body.description,
            shortDescription: req.body.shortDescription,
            displayImageUrls: req.body.displayImageUrls || [],
            audioPack: req.body.audioPack,
            createdByUserId: req.user._id,
            extraDetails: req.body.extraDetails
        };

        const character = await Character.create(characterData);

        // Create all linked documents
        const linkedDocs = await createLinkedDocuments(character._id, req.body);

        // Update character with linked document IDs
        Object.assign(character, linkedDocs);
        await character.save();

        // Populate and return
        let populatedCharacter = await populateCharacter(character);

        // Set isOwner flag (user is creating their own character)
        populatedCharacter.isOwner = true;

        logger.info(`Character created: ${character._id} by user: ${req.user._id}`);

        // 🔍 DEBUG: Log full populated personality data with NAMES
        if (populatedCharacter.personalityId) {
            console.log('\n========== CHARACTER PERSONALITY DATA ==========');
            console.log('Personality:', populatedCharacter.personalityId.personality);
            console.log('Voice:', populatedCharacter.personalityId.voice);
            console.log('\n--- Occupation ---');
            console.log('ID:', populatedCharacter.personalityId.occupationId?._id);
            console.log('Name:', populatedCharacter.personalityId.occupationId?.name);
            console.log('Emoji:', populatedCharacter.personalityId.occupationId?.emoji);
            console.log('\n--- Hobby ---');
            console.log('ID:', populatedCharacter.personalityId.hobbyId?._id);
            console.log('Name:', populatedCharacter.personalityId.hobbyId?.name);
            console.log('Emoji:', populatedCharacter.personalityId.hobbyId?.emoji);
            console.log('\n--- Relationship ---');
            console.log('ID:', populatedCharacter.personalityId.relationshipId?._id);
            console.log('Name:', populatedCharacter.personalityId.relationshipId?.name);
            console.log('Emoji:', populatedCharacter.personalityId.relationshipId?.emoji);
            console.log('\n--- Fetish ---');
            console.log('ID:', populatedCharacter.personalityId.fetishId?._id);
            console.log('Name:', populatedCharacter.personalityId.fetishId?.name);
            console.log('Emoji:', populatedCharacter.personalityId.fetishId?.emoji);
            console.log('\n--- Pose ---');
            console.log('ID:', populatedCharacter.personalityId.poseId?._id);
            console.log('Name:', populatedCharacter.personalityId.poseId?.name);
            console.log('Emoji:', populatedCharacter.personalityId.poseId?.emoji);
            console.log('Category:', populatedCharacter.personalityId.poseId?.category);
            console.log('================================================\n');
        }

        // ✨ AI PERSONALITY GENERATION - Generate comprehensive personalityDetails
        if (populatedCharacter.personalityId) {
            try {
                logger.info(`🤖 Generating AI personality details for: ${character.name}`);

                const personalityData = {
                    personality: populatedCharacter.personalityId.personality,
                    hobby: populatedCharacter.personalityId.hobbyId?.name,
                    occupation: populatedCharacter.personalityId.occupationId?.name,
                    relationship: populatedCharacter.personalityId.relationshipId?.name,
                    fetish: populatedCharacter.personalityId.fetishId?.name,
                    pose: populatedCharacter.personalityId.poseId?.name
                };

                const aiPersonalityDetails = await generatePersonalityDetails(personalityData);

                if (aiPersonalityDetails) {
                    // Update personality with AI-generated details
                    await CharacterPersonality.findByIdAndUpdate(
                        populatedCharacter.personalityId._id,
                        { personalityDetails: aiPersonalityDetails }
                    );

                    // Update populated character for response
                    populatedCharacter.personalityId.personalityDetails = aiPersonalityDetails;

                    logger.info(`✅ AI personality generated: "${aiPersonalityDetails.substring(0, 80)}..."`);
                }
            } catch (err) {
                logger.error(`❌ AI personality generation failed:`, err.message);
                // Continue without AI personality - don't block character creation
            }
        }

        // ✨ AI Image Generation - SYNCHRONOUS (wait for image before response)
        const aiGenerationEnabled = process.env.AI_GENERATION_ENABLED === 'true';

        if (aiGenerationEnabled && populatedCharacter.personalityId?.poseId) {
            const { generateCharacterImage } = require('../services/aiImageGeneration.service');

            logger.info(`🎨 Starting AI image generation for character: ${character.name}`);

            try {
                // Wait for image generation to complete
                const result = await generateCharacterImage(
                    {
                        _id: character._id,
                        displayId: character.displayId,
                        name: character.name,
                        age: character.age,
                        gender: character.gender,
                        description: character.description,
                        // Physical attributes
                        bodyType: populatedCharacter.physicalAttributesId?.bodyType,
                        hairColor: populatedCharacter.physicalAttributesId?.hairColor,
                        hairStyle: populatedCharacter.physicalAttributesId?.hairStyle,
                        eyeColor: populatedCharacter.physicalAttributesId?.eyeColor,
                        skinColor: populatedCharacter.physicalAttributesId?.skinColor,
                        ethnicity: populatedCharacter.physicalAttributesId?.ethnicity,
                        breastSize: populatedCharacter.physicalAttributesId?.breastSize,
                        buttSize: populatedCharacter.physicalAttributesId?.buttSize
                    },
                    populatedCharacter.personalityId.poseId,
                    populatedCharacter.personalityId.occupationId || null  // Pass occupation
                );

                if (result && (result.imagePath || result.cloudinaryUrl)) {
                    // Use cloudinaryUrl if available, otherwise fall back to imagePath
                    const imageUrl = result.cloudinaryUrl || result.imagePath;
                    
                    // Update character with generated image
                    character.displayImageUrls = [imageUrl, ...(character.displayImageUrls || [])];
                    await character.save();

                    // Save to CharacterMedia collection with prompt
                    const CharacterMedia = require('../models/CharacterMedia.model');
                    await CharacterMedia.create({
                        characterId: character._id,
                        userId: req.user._id,
                        mediaType: 'image',
                        mediaUrl: imageUrl,
                        visibility: 'personal',
                        prompt: result.promptUsed,  // Save the AI-generated prompt
                        generationParams: {
                            pose: result.pose,
                            poseCategory: result.poseCategory,
                            cloudinaryPublicId: result.cloudinaryPublicId,
                            cloudinaryUrl: result.cloudinaryUrl,
                            uploadPath: result.uploadPath,
                            fileSizeKb: result.fileSizeKb,
                            format: result.format,
                            quality: result.quality,
                            quality: process.env.AI_GENERATION_QUALITY || 'hq',
                            generationTime: result.generationTime
                        }
                    });

                    // Update populated character for response
                    populatedCharacter.displayImageUrls = character.displayImageUrls;

                    logger.info(`✅ AI image added to character: ${character._id}`);
                    logger.info(`   Image: ${imageUrl}, Time: ${result.generationTime}`);
                    logger.info(`   Cloudinary URL: ${result.cloudinaryUrl || 'N/A'}`);
                    logger.info(`   Prompt saved to CharacterMedia`);
                }
            } catch (err) {
                logger.error(`❌ AI image generation failed for ${character._id}:`, err.message);
                // Continue without image - don't block character creation
            }
        }

        res.status(201).json({
            success: true,
            statusCode: 201,
            message: 'Character created successfully',
            data: flattenCharacterData(populatedCharacter)
        });
    } catch (error) {
        logger.error('Error creating character:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: 'Character with this display ID already exists'
            });
        }

        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error creating character',
            error: error.message
        });
    }
};

/**
 * @desc    Get all characters with filtering, pagination, and sorting
 * @route   GET /api/v1/characters
 * @access  Public
 */
const getAllCharacters = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            gender,
            style,
            mainCategory,
            visibility = 'Public',
            tags,
            sort = '-createdAt',
            search
        } = req.query;

        // Build filter - simplified since categorization is now separate
        const filter = {
            deletedAt: null
        };

        if (gender) filter.gender = gender;

        // Execute query with pagination and populate all linked documents
        let query = Character.find(filter)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('physicalAttributesId')
            .populate('personalityId')
            .populate('aiGenerationId')
            .populate('chatConfigId')
            .populate('categorizationId')
            .populate('statisticsId')
            .populate('createdByUserId', 'name avatar');

        const characters = await query.lean();

        // Filter by categorization fields after population
        let filteredCharacters = characters;

        if (!req.user || visibility) {
            filteredCharacters = filteredCharacters.filter(char => {
                const vis = char.categorizationId?.visibility;
                const hidden = char.categorizationId?.hidden;

                if (hidden) return false;

                if (!req.user) {
                    return vis === 'Public';
                }

                if (visibility) {
                    return vis === visibility;
                }

                return true;
            });
        }

        if (style) {
            filteredCharacters = filteredCharacters.filter(char =>
                char.physicalAttributesId?.style === style
            );
        }

        if (mainCategory) {
            filteredCharacters = filteredCharacters.filter(char =>
                char.categorizationId?.mainCategory === mainCategory
            );
        }

        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            filteredCharacters = filteredCharacters.filter(char =>
                char.categorizationId?.tags?.some(tag => tagArray.includes(tag))
            );
        }

        // Get total count (approximate)
        const total = filteredCharacters.length;

        // Flatten characters for backward compatibility
        const flattenedCharacters = filteredCharacters.map(char => flattenCharacterData(char));

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Characters retrieved successfully',
            data: flattenedCharacters,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error getting characters:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving characters',
            error: error.message
        });
    }
};

/**
 * @desc    Get single character by ID or displayId
 * @route   GET /api/v1/characters/:id
 * @access  Public
 */
const getCharacterById = async (req, res) => {
    try {
        const { id } = req.params;

        let character = await Character.findByIdOrDisplayId(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Populate all linked documents
        character = await populateCharacter(character);

        // Check visibility permissions
        const visibility = character.categorizationId?.visibility;
        if (visibility === 'Private') {
            if (!req.user || !character.createdByUserId || character.createdByUserId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: 'You do not have permission to view this character'
                });
            }
        }

        // Increment view count (don't await to avoid slowing response)
        if (character.statisticsId) {
            CharacterStatistics.findByIdAndUpdate(
                character.statisticsId,
                { $inc: { viewCount: 1 } }
            ).catch(err => logger.error('Error incrementing view count:', err));
        }

        // Add isOwner flag
        if (req.user && character.createdByUserId) {
            character.isOwner = character.createdByUserId.toString() === req.user._id.toString();
        } else {
            character.isOwner = false;
        }

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Character retrieved successfully',
            data: flattenCharacterData(character)
        });
    } catch (error) {
        logger.error('Error getting character:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving character',
            error: error.message
        });
    }
};

/**
 * @desc    Update character
 * @route   PUT /api/v1/characters/:id
 * @access  Private (Owner or Admin)
 */
const updateCharacter = async (req, res) => {
    try {
        const { id } = req.params;

        const character = await Character.findByIdOrDisplayId(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Check ownership
        const isOwner = character.createdByUserId && character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'You do not have permission to update this character'
            });
        }

        // Update character
        Object.assign(character, req.body);
        await character.save();

        logger.info(`Character updated: ${character._id} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Character updated successfully',
            data: character
        });
    } catch (error) {
        logger.error('Error updating character:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error updating character',
            error: error.message
        });
    }
};

/**
 * @desc    Delete character (soft delete)
 * @route   DELETE /api/v1/characters/:id
 * @access  Private (Owner or Admin)
 */
const deleteCharacter = async (req, res) => {
    try {
        const { id } = req.params;

        const character = await Character.findByIdOrDisplayId(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Check ownership
        const isOwner = character.createdByUserId && character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'You do not have permission to delete this character'
            });
        }

        // Soft delete
        character.deletedAt = new Date();
        await character.save();

        logger.info(`Character deleted: ${character._id} by user: ${req.user._id}`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Character deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting character:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error deleting character',
            error: error.message
        });
    }
};

/**
 * @desc    Get my characters
 * @route   GET /api/v1/characters/my
 * @access  Private
 */
const getMyCharacters = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = '-createdAt', populate } = req.query;

        // DEBUG: Log the user ID
        logger.info(`🔍 DEBUG getMyCharacters - User ID: ${req.user._id}`);
        logger.info(`🔍 DEBUG getMyCharacters - User object:`, JSON.stringify(req.user));

        // Build the query
        const filter = {
            createdByUserId: req.user._id,
            deletedAt: null
        };

        logger.info(`🔍 DEBUG getMyCharacters - Filter:`, JSON.stringify(filter));

        let query = Character.find(filter)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        // Handle populate parameter
        if (populate) {
            const populateFields = populate.split(',').map(field => field.trim());

            // Map of allowed populate fields
            const populateMap = {
                'personality': 'personalityId',
                'physicalAttributes': 'physicalAttributesId',
                'aiGeneration': 'aiGenerationId',
                'chatConfig': 'chatConfigId',
                'categorization': 'categorizationId',
                'statistics': 'statisticsId',
                'occupationId': 'personalityId.occupationId',
                'hobbyId': 'personalityId.hobbyId',
                'relationshipId': 'personalityId.relationshipId',
                'fetishId': 'personalityId.fetishId'
            };

            // First, always populate the main fields
            query = query
                .populate('physicalAttributesId')
                .populate({
                    path: 'personalityId',
                    populate: [
                        { path: 'occupationId' },
                        { path: 'hobbyId' },
                        { path: 'relationshipId' },
                        { path: 'fetishId' },
                        { path: 'poseId' }
                    ]
                })
                .populate('aiGenerationId')
                .populate('chatConfigId')
                .populate('categorizationId')
                .populate('statisticsId')
                .populate('createdByUserId', 'name avatar');
        }

        const characters = await query.lean();

        const total = await Character.countDocuments({
            createdByUserId: req.user._id,
            deletedAt: null
        });

        // Flatten characters if populated
        const responseData = populate
            ? characters.map(char => flattenCharacterData(char))
            : characters;

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Your characters retrieved successfully',
            data: responseData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error getting my characters:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving your characters',
            error: error.message
        });
    }
};

/**
 * @desc    Get featured characters
 * @route   GET /api/v1/characters/featured
 * @access  Public
 */
const getFeaturedCharacters = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const characters = await Character.find({
            isHomepage: true,
            visibility: 'Public',
            hidden: false,
            deletedAt: null
        })
            .sort('-likeCount')
            .limit(parseInt(limit))
            .populate('createdByUserId', 'name avatar')
            .lean();

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Featured characters retrieved successfully',
            data: characters
        });
    } catch (error) {
        logger.error('Error getting featured characters:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving featured characters',
            error: error.message
        });
    }
};

/**
 * @desc    Get trending characters
 * @route   GET /api/v1/characters/trending
 * @access  Public
 */
const getTrendingCharacters = async (req, res) => {
    try {
        const { limit = 20, period = '7d' } = req.query;

        // Calculate date threshold based on period
        const now = new Date();
        const periodMap = {
            '24h': 1,
            '7d': 7,
            '30d': 30
        };
        const days = periodMap[period] || 7;
        const dateThreshold = new Date(now.setDate(now.getDate() - days));

        const characters = await Character.find({
            visibility: 'Public',
            hidden: false,
            deletedAt: null,
            createdAt: { $gte: dateThreshold }
        })
            .sort('-messageCount -likeCount')
            .limit(parseInt(limit))
            .populate('createdByUserId', 'name avatar')
            .lean();

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Trending characters retrieved successfully',
            data: characters
        });
    } catch (error) {
        logger.error('Error getting trending characters:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error retrieving trending characters',
            error: error.message
        });
    }
};

/**
 * @desc    Increment message count
 * @route   POST /api/v1/characters/:id/message
 * @access  Private
 */
const incrementMessageCount = async (req, res) => {
    try {
        const { id } = req.params;

        const character = await Character.findByIdOrDisplayId(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        await character.incrementMessageCount();

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Message count incremented successfully',
            data: { messageCount: character.messageCount }
        });
    } catch (error) {
        logger.error('Error incrementing message count:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error incrementing message count',
            error: error.message
        });
    }
};

/**
 * @desc    Generate image for character
 * @route   POST /api/v1/characters/:id/generate-image
 * @access  Private (Owner or Admin)
 */
const generateImageForCharacter = async (req, res) => {
    try {
        const { id } = req.params;
        const { poseId, customPrompt } = req.body;

        // Find character
        let character = await Character.findByIdOrDisplayId(id);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Check ownership
        const isOwner = character.createdByUserId && character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'You do not have permission to generate images for this character'
            });
        }

        // Check if AI generation is enabled
        const aiGenerationEnabled = process.env.AI_GENERATION_ENABLED === 'true';
        if (!aiGenerationEnabled) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: 'AI image generation is not enabled'
            });
        }

        // Populate character to get pose details
        character = await populateCharacter(character);

        // Determine which pose to use
        let poseToUse = null;

        if (poseId) {
            // Use provided poseId
            const CharacterPose = require('../models/CharacterPose.model');
            poseToUse = await CharacterPose.findById(poseId);

            if (!poseToUse) {
                return res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: 'Pose not found'
                });
            }
        } else if (character.personalityId?.poseId) {
            // Use character's default pose
            poseToUse = character.personalityId.poseId;
        } else {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: 'No pose provided and character does not have a default pose configured'
            });
        }

        // Override prompt if customPrompt is provided
        if (customPrompt) {
            poseToUse = {
                ...poseToUse.toObject ? poseToUse.toObject() : poseToUse,
                prompt: customPrompt
            };
        }

        logger.info(`🎨 Starting AI image generation for character: ${character.name} (${character._id})`);
        logger.info(`   Pose: ${poseToUse.name || 'Custom'}, Custom Prompt: ${customPrompt ? 'Yes' : 'No'}`);

        // Get populated character to access occupation
        const populatedChar = await populateCharacter(character);
        const occupation = populatedChar?.personalityId?.occupationId || null;
        
        if (occupation) {
            logger.info(`✅ Occupation found: ${occupation.name || 'Unknown'}`);
        } else {
            logger.warn(`⚠️ No occupation found for character: ${character.name}`);
        }

        // Generate image
        const result = await generateCharacterImage(
            {
                _id: character._id,
                displayId: character.displayId,
                name: character.name,
                age: character.age,
                gender: character.gender,
                description: character.description,
                // Physical attributes
                bodyType: populatedChar?.physicalAttributesId?.bodyType,
                hairColor: populatedChar?.physicalAttributesId?.hairColor,
                hairStyle: populatedChar?.physicalAttributesId?.hairStyle,
                eyeColor: populatedChar?.physicalAttributesId?.eyeColor,
                skinColor: populatedChar?.physicalAttributesId?.skinColor,
                ethnicity: populatedChar?.physicalAttributesId?.ethnicity,
                breastSize: populatedChar?.physicalAttributesId?.breastSize,
                buttSize: populatedChar?.physicalAttributesId?.buttSize
            },
            poseToUse,
            occupation  // Pass occupation object (with name property) or null
        );

        if (!result || !result.imagePath) {
            return res.status(500).json({
                success: false,
                statusCode: 500,
                message: 'Failed to generate image'
            });
        }

        // Update character with generated image
        // Use cloudinaryUrl if available, otherwise fall back to imagePath
        const imageUrl = result.cloudinaryUrl || result.imagePath;
        
        if (!imageUrl) {
            return res.status(500).json({
                success: false,
                statusCode: 500,
                message: 'Image generation failed - no image URL returned'
            });
        }
        
        character.displayImageUrls = [imageUrl, ...(character.displayImageUrls || [])];
        await character.save();

        // Save to CharacterMedia collection with prompt
        const CharacterMedia = require('../models/CharacterMedia.model');
        await CharacterMedia.create({
            characterId: character._id,
            userId: req.user._id,
            mediaType: 'image',
            mediaUrl: imageUrl,
            visibility: 'personal',
            prompt: result.promptUsed,  // Save the AI-generated prompt
            generationParams: {
                pose: result.pose,
                poseCategory: result.poseCategory,
                quality: process.env.AI_GENERATION_QUALITY || 'hq',
                generationTime: result.generationTime,
                customPrompt: customPrompt || null,
                customPose: poseId || null
            }
        });

        logger.info(`✅ AI image added to character: ${character._id}`);
        logger.info(`   Image: ${result.imagePath}, Time: ${result.generationTime}`);
        logger.info(`   Prompt saved to CharacterMedia`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Image generated successfully',
            data: {
                imagePath: result.imagePath,
                generationTime: result.generationTime,
                promptUsed: result.promptUsed,
                pose: result.pose,
                poseCategory: result.poseCategory,
                displayImageUrls: character.displayImageUrls,
                customPromptUsed: !!customPrompt,
                customPoseUsed: !!poseId
            }
        });
    } catch (error) {
        logger.error('Error generating image for character:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error generating image',
            error: error.message
        });
    }
};

/**
 * @desc    Generate video from character image
 * @route   POST /api/v1/characters/:id/media/:mediaId/generate-video
 * @access  Private
 */
const generateVideoForCharacter = async (req, res) => {
    try {
        const { id: characterId, mediaId } = req.params;
        const { duration = 5, resolution = '720p', poseId } = req.body;

        // Ensure duration is a number and valid (5 or 8)
        const videoDuration = parseInt(duration);
        if (![5, 8].includes(videoDuration)) {
            return res.status(400).json({
                success: false,
                message: 'Duration must be either 5 or 8 seconds'
            });
        }

        // Get character
        const character = await Character.findById(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Check ownership
        const isOwner = character.createdByUserId && character.createdByUserId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'You do not have permission to generate videos for this character'
            });
        }

        // Get source image
        const media = await CharacterMedia.findById(mediaId);
        if (!media || media.mediaType !== 'image') {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Image not found'
            });
        }

        logger.info(`🎬 Starting video generation for character: ${character.name}`);
        logger.info(`   Source image: ${media.mediaUrl}`);

        // Get pose name
        let poseName = media.generationParams?.pose || 'standing';
        if (poseId) {
            const CharacterPose = require('../models/CharacterPose.model');
            const pose = await CharacterPose.findById(poseId);
            if (pose) {
                poseName = pose.name;
            }
        }

        // Generate motion prompt using Groq
        const { generateMotionPrompt } = require('../services/motionPromptGenerator.service');
        const motionPrompt = await generateMotionPrompt(
            character,
            poseName,
            media.prompt || ''
        );

        // Upload image to Wavespeed
        const path = require('path');
        const imagePath = path.join(__dirname, '../../public', media.mediaUrl);

        const {
            uploadImageToWavespeed,
            submitVideoTask,
            pollVideoResult,
            downloadAndSaveVideo
        } = require('../services/videoGeneration.service');

        const imageUrl = await uploadImageToWavespeed(imagePath);

        // Submit video generation task
        const requestId = await submitVideoTask(imageUrl, motionPrompt, {
            duration: videoDuration,
            resolution
        });

        // Poll for result
        const videoUrl = await pollVideoResult(requestId);

        // Download and save video
        const videoPath = await downloadAndSaveVideo(
            videoUrl,
            character.displayId,
            character.name
        );

        // Save to CharacterMedia
        const videoMedia = await CharacterMedia.create({
            characterId: character._id,
            userId: req.user._id,
            mediaType: 'video',
            mediaUrl: videoPath,
            visibility: 'personal',
            prompt: motionPrompt,
            generationParams: {
                sourceImageId: mediaId,
                sourceImageUrl: media.mediaUrl,
                duration,
                resolution,
                wavespeedRequestId: requestId,
                pose: poseName
            },
            duration
        });

        logger.info(`✅ Video generated and saved: ${videoPath}`);

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Video generated successfully',
            data: {
                videoId: videoMedia._id,
                videoUrl: videoPath,
                motionPrompt,
                duration,
                resolution,
                sourceImage: media.mediaUrl,
                pose: poseName
            }
        });

    } catch (error) {
        logger.error('❌ Video generation error:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Video generation failed',
            error: error.message
        });
    }
}

/**
 * ==================== QUEUE-BASED CHARACTER CREATION ====================
 */

const { addCharacterCreationJob, getJobStatus, getJob, cancelJob: cancelQueueJob } = require('../queues/characterCreation.queue');
const CharacterJob = require('../models/CharacterJob.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Create character using background queue
 * @route POST /api/v1/characters/queue
 */
const createCharacterAsync = async (req, res) => {
    try {
        // Validate user is authenticated
        if (!req.user || !req.user._id) {
            logger.error('❌ Authentication failed: req.user is undefined');
            return res.status(401).json({
                success: false,
                statusCode: 401,
                message: 'Authentication required',
                error: 'User not authenticated'
            });
        }

        const jobId = uuidv4();
        const userId = req.user._id.toString();

        logger.info(`📥 Creating character job for user: ${userId}`);

        // Create job record in database
        const characterJob = await CharacterJob.create({
            jobId,
            userId: userId,
            status: 'pending',
            characterData: req.body,
            progress: 0
        });

        logger.info(`✅ CharacterJob document created: ${characterJob._id}`);

        // Add job to queue
        await addCharacterCreationJob({
            jobId,
            userId: userId,
            characterData: req.body
        });

        logger.info(`📥 Character creation job queued: ${jobId} for user: ${userId}`);

        res.status(202).json({
            success: true,
            statusCode: 202,
            message: 'Character creation job queued successfully',
            data: {
                jobId,
                status: 'pending',
                statusUrl: `/api/v1/characters/jobs/${jobId}`
            }
        });
    } catch (error) {
        logger.error('❌ Failed to queue character creation:', error);
        logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            user: req.user ? req.user._id : 'undefined'
        });
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to queue character creation',
            error: error.message
        });
    }
};

/**
 * Get job status by ID
 * @route GET /api/v1/character-jobs/:jobId
 */
const getCharacterJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;

        // Get job from database
        const dbJob = await CharacterJob.findOne({ jobId })
            .populate('result.characterId', 'name displayId displayImageUrls');

        if (!dbJob) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Job not found'
            });
        }

        // Check if user owns this job
        if (dbJob.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'Access denied'
            });
        }

        // Get queue status
        const queueStatus = await getJobStatus(jobId);

        res.json({
            success: true,
            statusCode: 200,
            data: {
                jobId: dbJob.jobId,
                status: dbJob.status,
                progress: dbJob.progress,
                result: dbJob.result,
                failedReason: dbJob.failedReason,
                attemptsMade: dbJob.attemptsMade,
                createdAt: dbJob.createdAt,
                startedAt: dbJob.startedAt,
                completedAt: dbJob.completedAt,
                queueInfo: queueStatus
            }
        });
    } catch (error) {
        logger.error('❌ Failed to get job status:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to get job status',
            error: error.message
        });
    }
};

/**
 * Get all jobs for current user
 * @route GET /api/v1/character-jobs
 */
const getMyCharacterJobs = async (req, res) => {
    try {
        const { status, limit = 20, skip = 0 } = req.query;

        const query = { userId: req.user._id };
        if (status) {
            query.status = status;
        }

        const jobs = await CharacterJob.find(query)
            .populate('result.characterId', 'name displayId displayImageUrls')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await CharacterJob.countDocuments(query);

        res.json({
            success: true,
            statusCode: 200,
            data: jobs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('❌ Failed to get user jobs:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to get jobs',
            error: error.message
        });
    }
};

/**
 * Cancel a pending/active job
 * @route DELETE /api/v1/character-jobs/:jobId
 */
const cancelCharacterJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        // Get job from database
        const dbJob = await CharacterJob.findOne({ jobId });

        if (!dbJob) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Job not found'
            });
        }

        // Check if user owns this job
        if (dbJob.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'Access denied'
            });
        }

        // Check if job can be cancelled
        if (['completed', 'failed', 'cancelled'].includes(dbJob.status)) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: `Cannot cancel ${dbJob.status} job`
            });
        }

        // Cancel job in queue
        await cancelQueueJob(jobId);

        // Update database
        await CharacterJob.findOneAndUpdate(
            { jobId },
            { status: 'cancelled', completedAt: new Date() }
        );

        logger.info(`🗑️ Job cancelled: ${jobId}`);

        res.json({
            success: true,
            statusCode: 200,
            message: 'Job cancelled successfully'
        });
    } catch (error) {
        logger.error('❌ Failed to cancel job:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to cancel job',
            error: error.message
        });
    }
};

/**
 * ==================== QUEUE-BASED MEDIA GENERATION ====================
 */

const { addImageGenerationJob, addVideoGenerationJob, getJobStatus: getMediaJobStatus } = require('../queues/mediaGeneration.queue');
const MediaGenerationJob = require('../models/MediaGenerationJob.model');

/**
 * Generate image asynchronously (queue-based)
 * @route POST /api/v1/characters/:id/generate-image/queue
 */
const generateImageAsync = async (req, res) => {
    try {
        const { id: characterId } = req.params;
        const { poseId } = req.body;
        const jobId = uuidv4();

        // Verify character exists and user has access
        const character = await Character.findById(characterId);
        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        // Create job record
        const mediaJob = await MediaGenerationJob.create({
            jobId,
            userId: req.user._id,
            characterId,
            type: 'image',
            status: 'pending',
            inputData: { poseId },
            progress: 0
        });

        // Add to queue
        await addImageGenerationJob({
            jobId,
            userId: req.user._id,
            characterId,
            poseId
        });

        logger.info(`📥 Image generation job queued: ${jobId}`);

        res.status(202).json({
            success: true,
            statusCode: 202,
            message: 'Image generation job queued successfully',
            data: {
                jobId,
                status: 'pending',
                statusUrl: `/api/v1/characters/media-jobs/${jobId}`
            }
        });
    } catch (error) {
        logger.error('❌ Failed to queue image generation:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to queue image generation',
            error: error.message
        });
    }
};

/**
 * Generate video asynchronously (queue-based)
 * @route POST /api/v1/characters/:id/media/:mediaId/generate-video/queue
 */
const generateVideoAsync = async (req, res) => {
    try {
        const { id: characterId, mediaId } = req.params;
        const { duration = 5, resolution = '720p', poseId } = req.body;
        const jobId = uuidv4();

        // Validate duration
        const videoDuration = parseInt(duration);
        if (![5, 8].includes(videoDuration)) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: 'Duration must be either 5 or 8 seconds'
            });
        }

        // Verify character and media exist
        const character = await Character.findById(characterId);
        const media = await CharacterMedia.findById(mediaId);

        if (!character) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Character not found'
            });
        }

        if (!media) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Media not found'
            });
        }

        // Create job record
        const mediaJob = await MediaGenerationJob.create({
            jobId,
            userId: req.user._id,
            characterId,
            type: 'video',
            status: 'pending',
            inputData: { mediaId, duration: videoDuration, resolution, poseId },
            progress: 0
        });

        // Add to queue
        await addVideoGenerationJob({
            jobId,
            userId: req.user._id,
            characterId,
            mediaId,
            duration: videoDuration,
            resolution,
            poseId
        });

        logger.info(`📥 Video generation job queued: ${jobId}`);

        res.status(202).json({
            success: true,
            statusCode: 202,
            message: 'Video generation job queued successfully',
            data: {
                jobId,
                status: 'pending',
                statusUrl: `/api/v1/characters/media-jobs/${jobId}`
            }
        });
    } catch (error) {
        logger.error('❌ Failed to queue video generation:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to queue video generation',
            error: error.message
        });
    }
};

/**
 * Get media generation job status
 * @route GET /api/v1/media-jobs/:jobId
 */
const getMediaGenerationJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;

        const dbJob = await MediaGenerationJob.findOne({ jobId })
            .populate('characterId', 'name displayId displayImageUrls')
            .populate('result.mediaId');

        if (!dbJob) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Job not found'
            });
        }

        // Check access
        if (dbJob.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            statusCode: 200,
            data: {
                jobId: dbJob.jobId,
                type: dbJob.type,
                status: dbJob.status,
                progress: dbJob.progress,
                result: dbJob.result,
                character: dbJob.characterId,
                failedReason: dbJob.failedReason,
                createdAt: dbJob.createdAt,
                completedAt: dbJob.completedAt
            }
        });
    } catch (error) {
        logger.error('❌ Failed to get media job status:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to get job status',
            error: error.message
        });
    }
};

/**
 * Get all media generation jobs for user
 * @route GET /api/v1/media-jobs
 */
const getMyMediaJobs = async (req, res) => {
    try {
        const { type, status, limit = 20, skip = 0 } = req.query;

        const query = { userId: req.user._id };
        if (type) query.type = type;
        if (status) query.status = status;

        const jobs = await MediaGenerationJob.find(query)
            .populate('characterId', 'name displayId displayImageUrls')
            .populate('result.mediaId')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await MediaGenerationJob.countDocuments(query);

        res.json({
            success: true,
            statusCode: 200,
            data: jobs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        logger.error('❌ Failed to get media jobs:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to get jobs',
            error: error.message
        });
    }
};

module.exports = {
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
};
