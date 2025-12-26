// src/queues/imageGeneration.queue.js - Bull Queue for AI Image Generation

const Bull = require('bull');
const logger = require('../utils/logger');
const { generateCharacterImage } = require('../services/aiImageGeneration.service');
const Character = require('../models/Character.model');

// Create queue instance
const imageGenerationQueue = new Bull('image-generation', {
    redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    },
    defaultJobOptions: {
        attempts: 3,                    // Retry 3 times
        backoff: {
            type: 'exponential',        // Exponential backoff
            delay: 5000                 // Start with 5s delay
        },
        removeOnComplete: {
            age: 24 * 3600,            // Keep completed jobs for 24 hours
            count: 1000                 // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600         // Keep failed jobs for 7 days
        }
    },
    limiter: {
        max: 10,                        // Max 10 jobs
        duration: 1000                  // Per second
    }
});

/**
 * Process image generation jobs
 * Concurrency: 5 jobs at a time
 */
imageGenerationQueue.process(5, async (job) => {
    const { characterData, pose, userId } = job.data;

    logger.info(`📸 Processing image generation job ${job.id} for character: ${characterData.name}`);

    try {
        // Update job progress
        await job.progress(10);

        // Generate image
        const result = await generateCharacterImage(characterData, pose);

        if (!result || !result.imagePath) {
            throw new Error('Image generation failed - no image returned');
        }

        await job.progress(80);

        // Update character with generated image
        const character = await Character.findById(characterData._id);
        if (character) {
            // Use cloudinaryUrl if available, otherwise fall back to imagePath
            const imageUrl = result.cloudinaryUrl || result.imagePath;
            
            if (imageUrl) {
                character.displayImageUrls = [imageUrl, ...(character.displayImageUrls || [])];
                await character.save();

                logger.info(`✅ Image added to character: ${character._id}`);
                logger.info(`   Image URL: ${imageUrl}`);
                logger.info(`   Cloudinary URL: ${result.cloudinaryUrl || 'N/A'}`);
            } else {
                logger.warn(`⚠️ No image URL returned from generation result`);
            }
        }

        await job.progress(100);

        return {
            success: true,
            characterId: characterData._id,
            imagePath: result.imagePath,
            generationTime: result.generationTime
        };

    } catch (error) {
        logger.error(`❌ Image generation job ${job.id} failed:`, error.message);
        throw error; // Will trigger retry
    }
});

/**
 * Event Listeners
 */

// Job completed
imageGenerationQueue.on('completed', (job, result) => {
    logger.info(`✅ Job ${job.id} completed for character: ${result.characterId}`);
    logger.info(`   Image: ${result.imagePath}, Time: ${result.generationTime}`);
});

// Job failed
imageGenerationQueue.on('failed', (job, err) => {
    logger.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

    if (job.attemptsMade >= job.opts.attempts) {
        logger.error(`💀 Job ${job.id} permanently failed - moved to dead letter queue`);
    }
});

// Job progress
imageGenerationQueue.on('progress', (job, progress) => {
    logger.debug(`📊 Job ${job.id} progress: ${progress}%`);
});

// Queue error
imageGenerationQueue.on('error', (error) => {
    logger.error('❌ Queue error:', error);
});

// Queue stalled
imageGenerationQueue.on('stalled', (job) => {
    logger.warn(`⚠️  Job ${job.id} stalled - will be retried`);
});

/**
 * Add job to queue
 * @param {Object} characterData - Character data
 * @param {Object} pose - Selected pose
 * @param {string} userId - User ID
 * @param {string} priority - Job priority (high, normal, low)
 * @returns {Promise<Job>}
 */
const addImageGenerationJob = async (characterData, pose, userId, priority = 'normal') => {
    const priorityMap = {
        high: 1,
        normal: 5,
        low: 10
    };

    const job = await imageGenerationQueue.add(
        {
            characterData,
            pose,
            userId
        },
        {
            priority: priorityMap[priority] || 5,
            jobId: `img-${characterData._id}-${Date.now()}`,
            timeout: 120000 // 2 minutes timeout
        }
    );

    logger.info(`🎯 Added image generation job ${job.id} to queue (priority: ${priority})`);
    logger.info(`   Character: ${characterData.name}, Pose: ${pose?.name || 'Default'}`);

    return job;
};

/**
 * Get queue stats
 */
const getQueueStats = async () => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        imageGenerationQueue.getWaitingCount(),
        imageGenerationQueue.getActiveCount(),
        imageGenerationQueue.getCompletedCount(),
        imageGenerationQueue.getFailedCount(),
        imageGenerationQueue.getDelayedCount()
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
    };
};

/**
 * Clean old jobs
 */
const cleanOldJobs = async () => {
    await imageGenerationQueue.clean(24 * 3600 * 1000, 'completed'); // 24 hours
    await imageGenerationQueue.clean(7 * 24 * 3600 * 1000, 'failed'); // 7 days
    logger.info('🧹 Cleaned old jobs from queue');
};

// Clean old jobs every 6 hours
setInterval(cleanOldJobs, 6 * 60 * 60 * 1000);

module.exports = {
    imageGenerationQueue,
    addImageGenerationJob,
    getQueueStats,
    cleanOldJobs
};
