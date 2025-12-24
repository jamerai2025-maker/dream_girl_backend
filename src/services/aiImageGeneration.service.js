// src/services/aiImageGeneration.service.js - AI Image Generation Service

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate character image using AI API
 * @param {Object} characterData - Character data
 * @param {Object} pose - Selected pose with prompt
 * @returns {Promise<string>} - Image file path
 */
const generateCharacterImage = async (characterData, pose, occupation = null) => {
    try {
        const apiUrl = process.env.AI_GENERATION_API_URL || 'https://vtlt473h3x21jp-8000.proxy.runpod.net/generate';
        const quality = process.env.AI_GENERATION_QUALITY || 'hq';

        // Map quality values to Python API expected values
        const qualityMap = {
            'hq': 'ultra_hd',
            'standard': 'standard',
            'hd': 'hd',
            'ultra_hd': 'ultra_hd',
            'extreme': 'extreme'
        };
        const mappedQuality = qualityMap[quality] || 'ultra_hd';

        // Build character object matching Python's CharacterData Pydantic model
        const characterPayload = {
            name: characterData.name,
            age: characterData.age,
            gender: characterData.gender,
            description: characterData.description || `A ${characterData.age} year old ${characterData.gender}`,
            // Physical attributes (flattened)
            ethnicity: characterData.ethnicity,
            eyeColor: characterData.eyeColor,
            hairStyle: characterData.hairStyle,
            breastSize: characterData.breastSize,
            buttSize: characterData.buttSize
        };

        // Add personalityId with poseId and occupationId
        if (pose || occupation) {
            characterPayload.personalityId = {};

            if (pose) {
                characterPayload.personalityId.poseId = pose.name;  // Send pose name directly
            }

            if (occupation) {
                // Send occupation NAME instead of ID so Python can match it
                characterPayload.personalityId.occupationId = occupation.name;
            }
        }

        // Build API request payload matching Python's GenerateRequest Pydantic model
        const requestPayload = {
            character: characterPayload,  // Changed from character_data to character
            pose_name: pose?.name || null,  // Added pose_name at root level
            quality: mappedQuality,  // Use mapped quality value
            seed: null,  // Let Python generate random seed
            use_highres: true,  // Enable Highres Fix
            enhance: true  // Enable post-processing enhancement
        };

        // Log full character details before sending
        logger.info(`\n${'='.repeat(70)}`);
        logger.info(`🎨 GENERATING AI IMAGE FOR CHARACTER`);
        logger.info(`${'='.repeat(70)}`);
        logger.info(`📋 Character Details:`);
        logger.info(`   Name: ${characterData.name}`);
        logger.info(`   Age: ${characterData.age}`);
        logger.info(`   Gender: ${characterData.gender}`);
        logger.info(`   Ethnicity: ${characterData.ethnicity || 'Not specified'}`);
        logger.info(`   Eye Color: ${characterData.eyeColor || 'Not specified'}`);
        logger.info(`   Hair Style: ${characterData.hairStyle || 'Not specified'}`);
        logger.info(`   Breast Size: ${characterData.breastSize || 'Not specified'}`);
        logger.info(`   Butt Size: ${characterData.buttSize || 'Not specified'}`);
        logger.info(`\n🎭 Personality Details:`);
        logger.info(`   Pose: ${pose?.name || 'Default'}`);
        logger.info(`   Occupation: ${occupation?.name || 'None'}`);
        logger.info(`\n⚙️ Generation Settings:`);
        logger.info(`   Quality: ${mappedQuality}`);
        logger.info(`   Highres: ${requestPayload.use_highres}`);
        logger.info(`   Enhance: ${requestPayload.enhance}`);
        logger.info(`\n📤 Request Payload:`);
        logger.info(JSON.stringify(requestPayload, null, 2));
        logger.info(`${'='.repeat(70)}\n`);

        // Call AI generation API
        const response = await axios.post(apiUrl, requestPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minutes timeout
        });

        // Python API returns: { success, image_base64, character_name, pose, occupation, quality, resolution, generation_time, seed }
        if (!response.data || !response.data.success || !response.data.image_base64) {
            throw new Error('Invalid response from AI generation API');
        }

        const { image_base64: base64Image, generation_time, seed, resolution } = response.data;

        logger.info(`✅ Image generated in ${generation_time}`);
        logger.info(`   Resolution: ${resolution}, Seed: ${seed}`);

        // Save image to assets folder
        const imagePath = await saveBase64Image(base64Image, characterData.displayId, characterData.name, characterData._id);

        return {
            imagePath,
            generationTime: generation_time,
            promptUsed: `Generated with pose: ${pose?.name || 'standing'}`,
            pose: pose?.name,
            poseCategory: pose?.category,
            seed: seed,
            resolution: resolution
        };

    } catch (error) {
        logger.error('❌ AI image generation failed:', error.message);

        // Log additional error details
        if (error.response) {
            logger.error('   Response status:', error.response.status);
            logger.error('   Response statusText:', error.response.statusText);
            logger.error('   Response data:', JSON.stringify(error.response.data, null, 2));
            logger.error('   Response headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            logger.error('   No response received from AI service');
            logger.error('   Request URL:', error.config?.url);
            logger.error('   Request method:', error.config?.method);
            logger.error('   Request timeout:', error.config?.timeout);
            logger.error('   Error code:', error.code);
            logger.error('   Error syscall:', error.syscall);
            logger.error('   Error address:', error.address);
            logger.error('   Error port:', error.port);
        } else {
            logger.error('   Error setting up request');
        }

        // Always log the full error details
        logger.error('   Full error object:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack,
            url: error.config?.url,
            method: error.config?.method,
            hasResponse: !!error.response,
            hasRequest: !!error.request,
            isAxiosError: error.isAxiosError
        });

        // Don't throw error - just log it and return null
        // Character creation should succeed even if image generation fails
        return null;
    }
};

/**
 * Save base64 image to local storage
 * @param {string} base64Image - Base64 encoded image
 * @param {string} displayId - Character displayId for folder name
 * @param {string} characterName - Character name for filename
 * @param {string} characterId - Character ID
 * @returns {Promise<string>} - Image URL
 */
const saveBase64Image = async (base64Image, displayId, characterName, characterId) => {
    try {
        // Save to local storage only
        logger.info('📁 Saving image to local file storage');

        const path = require('path');

        // Create character-specific directory: public/assets/characters/{displayId}/
        const characterDir = path.join(__dirname, '../../public/assets/characters', displayId);
        await fs.mkdir(characterDir, { recursive: true });

        const timestamp = Date.now();
        const sanitizedName = characterName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedName}_${timestamp}.png`;
        const filePath = path.join(characterDir, filename);

        const imageBuffer = Buffer.from(base64Image, 'base64');
        await fs.writeFile(filePath, imageBuffer);

        const imageUrl = `/assets/characters/${displayId}/${filename}`;
        logger.info(`💾 Image saved locally: ${imageUrl}`);

        return imageUrl;

    } catch (error) {
        logger.error('❌ Failed to save image:', error.message);
        throw error;
    }
};


/**
 * Generate multiple images for character (optional feature)
 * @param {Object} characterData - Character data
 * @param {Array} poses - Array of poses
 * @param {number} count - Number of images to generate
 * @returns {Promise<Array>} - Array of image paths
 */
const generateMultipleImages = async (characterData, poses, count = 3) => {
    try {
        const imagePromises = poses.slice(0, count).map(pose =>
            generateCharacterImage(characterData, pose)
        );

        const results = await Promise.allSettled(imagePromises);

        return results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value.imagePath);

    } catch (error) {
        logger.error('❌ Failed to generate multiple images:', error.message);
        return [];
    }
};

module.exports = {
    generateCharacterImage,
    saveBase64Image,
    generateMultipleImages
};
