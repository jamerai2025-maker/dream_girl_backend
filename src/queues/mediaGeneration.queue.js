const Queue = require('bull');
const queueConfig = require('../config/queue.config');
const logger = require('../utils/logger');

/**
 * Image Generation Queue
 * Handles background processing of AI image generation requests
 */

const imageGenerationQueue = new Queue(
    'image-generation',
    {
        redis: queueConfig.redis,
        defaultJobOptions: queueConfig.defaultJobOptions,
        limiter: {
            max: 5, // Max 5 jobs
            duration: 1000 // per second
        }
    }
);

// Event listeners
imageGenerationQueue.on('completed', (job, result) => {
    logger.info(`✅ Image generation job ${job.id} completed`, {
        jobId: job.id,
        characterId: result.characterId,
        imageUrl: result.imageUrl
    });
});

imageGenerationQueue.on('failed', (job, err) => {
    logger.error(`❌ Image generation job ${job.id} failed`, {
        jobId: job.id,
        error: err.message
    });
});

imageGenerationQueue.on('progress', (job, progress) => {
    logger.info(`⏳ Image generation job ${job.id} progress: ${progress}%`);
});

/**
 * Video Generation Queue
 * Handles background processing of video generation requests
 */

const videoGenerationQueue = new Queue(
    'video-generation',
    {
        redis: queueConfig.redis,
        defaultJobOptions: queueConfig.defaultJobOptions,
        limiter: {
            max: 3, // Max 3 jobs (video generation is more intensive)
            duration: 1000 // per second
        }
    }
);

// Event listeners
videoGenerationQueue.on('completed', (job, result) => {
    logger.info(`✅ Video generation job ${job.id} completed`, {
        jobId: job.id,
        characterId: result.characterId,
        videoUrl: result.videoUrl
    });
});

videoGenerationQueue.on('failed', (job, err) => {
    logger.error(`❌ Video generation job ${job.id} failed`, {
        jobId: job.id,
        error: err.message
    });
});

videoGenerationQueue.on('progress', (job, progress) => {
    logger.info(`⏳ Video generation job ${job.id} progress: ${progress}%`);
});

/**
 * Add image generation job
 */
async function addImageGenerationJob(data) {
    try {
        const job = await imageGenerationQueue.add(data, {
            priority: data.priority || 5,
            timeout: 300000, // 5 minutes
            jobId: data.jobId
        });

        logger.info(`📥 Added image generation job to queue`, {
            jobId: job.id,
            characterId: data.characterId
        });

        return job;
    } catch (error) {
        logger.error('❌ Failed to add image generation job:', error);
        throw error;
    }
}

/**
 * Add video generation job
 */
async function addVideoGenerationJob(data) {
    try {
        const job = await videoGenerationQueue.add(data, {
            priority: data.priority || 5,
            timeout: 600000, // 10 minutes (video takes longer)
            jobId: data.jobId
        });

        logger.info(`📥 Added video generation job to queue`, {
            jobId: job.id,
            characterId: data.characterId
        });

        return job;
    } catch (error) {
        logger.error('❌ Failed to add video generation job:', error);
        throw error;
    }
}

/**
 * Get job status
 */
async function getJobStatus(queue, jobId) {
    const job = await queue.getJob(jobId);

    if (!job) {
        return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
        jobId: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
    };
}

module.exports = {
    imageGenerationQueue,
    videoGenerationQueue,
    addImageGenerationJob,
    addVideoGenerationJob,
    getJobStatus
};
