const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Motion Prompt Generator using Python FastAPI
 * Generates cinematic motion descriptions for image-to-video
 */

/**
 * Generate motion prompt for video generation
 * @param {Object} character - Character data
 * @param {string} pose - Pose name
 * @param {string} imagePrompt - Original image generation prompt
 * @returns {Promise<string>} - Motion prompt
 */
async function generateMotionPrompt(character, pose, imagePrompt) {
    try {
        logger.info(`🎬 Generating motion prompt for: ${character.name}`);
        logger.info(`   Pose: ${pose}`);

        // Use environment variable or fallback to RunPod URL
        const apiUrl = process.env.MOTION_PROMPT_API_URL || process.env.AI_GENERATION_API_URL || 'https://dkxc34dp79wfk4-8000.proxy.runpod.net';
        const endpoint = `${apiUrl}/generate-motion-prompt`;

        logger.info(`   API: ${endpoint}`);

        // Call Python FastAPI for motion prompt generation
        const response = await axios.post(
            endpoint,
            {
                character_name: character.name,
                character_age: character.age,
                pose_name: pose,
                image_prompt: imagePrompt || ''
            },
            {
                timeout: 30000
            }
        );

        const motionPrompt = response.data.data.motion_prompt;

        logger.info(`✅ Motion prompt generated: "${motionPrompt}"`);

        return motionPrompt;

    } catch (error) {
        logger.error('❌ Motion prompt generation error:', error.message);
        if (error.response) {
            logger.error('   Response status:', error.response.status);
            logger.error('   Response data:', error.response.data);
        }

        // Fallback motion prompt
        const fallback = `Camera slowly dolly-in, ${character.name} makes subtle movements, natural breathing, soft lighting, cinematic atmosphere`;
        logger.info(`   Using fallback: "${fallback}"`);

        return fallback;
    }
}

module.exports = {
    generateMotionPrompt
};
