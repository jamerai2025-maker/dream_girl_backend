const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Wavespeed AI Video Generation Service
 * Generates videos from character images using Wan 2.6 model
 */

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3';

/**
 * Upload image to Wavespeed
 * @param {string} imagePath - Local path to image file
 * @returns {Promise<string>} - Wavespeed image URL
 */
async function uploadImageToWavespeed(imagePath) {
    try {
        logger.info(`📤 Uploading image to Wavespeed: ${imagePath}`);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(imagePath));

        const response = await axios.post(
            `${WAVESPEED_BASE_URL}/media/upload/binary`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
                    ...formData.getHeaders()
                },
                timeout: 60000 // 60 seconds
            }
        );

        if (response.data.code !== 200) {
            throw new Error(`Upload failed: ${response.data.message}`);
        }

        const imageUrl = response.data.data.download_url;
        logger.info(`✅ Image uploaded: ${imageUrl}`);

        return imageUrl;

    } catch (error) {
        logger.error('❌ Wavespeed upload error:', error.message);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}

/**
 * Submit video generation task to Wavespeed
 * @param {string} imageUrl - Wavespeed image URL
 * @param {string} motionPrompt - Motion description
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Request ID
 */
async function submitVideoTask(imageUrl, motionPrompt, options = {}) {
    try {
        logger.info(`🎬 Submitting video generation task...`);
        logger.info(`   Motion prompt: ${motionPrompt}`);

        const payload = {
            image: imageUrl,
            prompt: motionPrompt,
            duration: parseInt(options.duration) || 5,  // Ensure it's a number
            resolution: options.resolution || '720p',
            seed: -1
        };

        logger.info(`📤 Request payload:`, JSON.stringify(payload, null, 2));

        const response = await axios.post(
            `${WAVESPEED_BASE_URL}/wavespeed-ai/wan-2.2-spicy/image-to-video`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        logger.info(`📥 Full API Response:`, JSON.stringify(response.data, null, 2));

        if (response.data.code !== 200) {
            throw new Error(`Task submission failed: ${response.data.message}`);
        }

        // Try different possible paths for request_id
        const requestId = response.data.data?.request_id ||
            response.data.request_id ||
            response.data.data?.id ||
            response.data.id;

        if (!requestId) {
            logger.error(`❌ No request_id found in response. Full response:`, JSON.stringify(response.data, null, 2));
            throw new Error('No request_id in API response');
        }

        logger.info(`✅ Task submitted: ${requestId}`);

        return requestId;

    } catch (error) {
        logger.error('❌ Wavespeed task submission error:', error.message);
        console.error('\n🔍 FULL ERROR DETAILS:');
        console.error('Error object:', error);

        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));

            logger.error('   Response status:', error.response.status);
            logger.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received');
            logger.error('   No response received from server');
        } else {
            console.error('Error setting up request:', error.message);
            logger.error('   Error details:', error.message);
        }
        throw new Error(`Failed to submit video task: ${error.message}`);
    }
}

/**
 * Poll for video generation result
 * @param {string} requestId - Wavespeed request ID
 * @param {number} maxAttempts - Maximum polling attempts
 * @returns {Promise<string>} - Video URL
 */
async function pollVideoResult(requestId, maxAttempts = 60) {
    try {
        logger.info(`⏳ Polling for video result: ${requestId}`);

        for (let i = 0; i < maxAttempts; i++) {
            const response = await axios.get(
                `${WAVESPEED_BASE_URL}/predictions/${requestId}/result`,
                {
                    headers: {
                        'Authorization': `Bearer ${WAVESPEED_API_KEY}`
                    },
                    timeout: 10000
                }
            );

            logger.info(`📥 Poll response:`, JSON.stringify(response.data, null, 2));

            const status = response.data.data?.status || response.data.status;
            logger.info(`   Attempt ${i + 1}/${maxAttempts}: ${status}`);

            if (status === 'completed') {
                // Try multiple possible paths for video URL (outputs[0] is the correct one for wan-2.2-spicy)
                const videoUrl = response.data.data?.outputs?.[0] ||
                    response.data.data?.output_url ||
                    response.data.data?.output?.[0] ||
                    response.data.output_url ||
                    response.data.output?.[0] ||
                    response.data.data?.video_url ||
                    response.data.video_url;

                if (!videoUrl) {
                    logger.error(`❌ No video URL found in completed response:`, JSON.stringify(response.data, null, 2));
                    throw new Error('No video URL in completed response');
                }

                logger.info(`✅ Video ready: ${videoUrl}`);
                return videoUrl;
            }

            if (status === 'failed') {
                const errorMsg = response.data.data?.error || 'Unknown error';
                throw new Error(`Video generation failed: ${errorMsg}`);
            }

            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Video generation timeout');

    } catch (error) {
        logger.error('❌ Wavespeed polling error:', error.message);
        throw new Error(`Failed to get video result: ${error.message}`);
    }
}

/**
 * Download video from Wavespeed and save locally
 * @param {string} videoUrl - Wavespeed video URL
 * @param {string} displayId - Character display ID
 * @param {string} characterName - Character name
 * @returns {Promise<string>} - Local video path
 */
async function downloadAndSaveVideo(videoUrl, displayId, characterName) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`📥 Downloading video (attempt ${attempt}/${maxRetries}): ${videoUrl}`);

            // Create videos directory using displayId (matching image storage pattern)
            const videosDir = path.join(__dirname, '../../public/assets/characters', displayId, 'videos');

            logger.info(`📁 Creating directory: ${videosDir}`);
            if (!fs.existsSync(videosDir)) {
                fs.mkdirSync(videosDir, { recursive: true });
            }

            // Generate filename
            const timestamp = Date.now();
            const sanitizedName = characterName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const filename = `${sanitizedName}_${timestamp}.mp4`;
            const videoPath = path.join(videosDir, filename);

            logger.info(`📝 Downloading to: ${videoPath}`);

            // Download video with retry logic and IPv4 preference
            const response = await axios.get(videoUrl, {
                responseType: 'stream',
                timeout: 180000, // 3 minutes
                maxRedirects: 5,
                family: 4, // Force IPv4 to avoid IPv6 ENETUNREACH errors
                httpsAgent: new (require('https').Agent)({
                    family: 4,
                    keepAlive: true,
                    timeout: 180000
                })
            });

            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            const relativePath = `/assets/characters/${displayId}/videos/${filename}`;
            logger.info(`✅ Video saved: ${relativePath}`);

            return relativePath;

        } catch (error) {
            lastError = error;
            logger.error(`❌ Video download attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.info(`⏳ Retrying in ${waitTime / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    logger.error('❌ All download attempts failed');
    console.error('Full download error:', lastError);
    console.error('Error stack:', lastError?.stack);
    throw new Error(`Failed to download video after ${maxRetries} attempts: ${lastError?.message}`);
}


module.exports = {
    uploadImageToWavespeed,
    submitVideoTask,
    pollVideoResult,
    downloadAndSaveVideo
};
