const Queue = require('bull');
const queueConfig = require('../config/queue.config');
const logger = require('../utils/logger');

/**
 * Character Creation Queue
 * Handles background processing of character creation requests
 */

const characterCreationQueue = new Queue(
    queueConfig.characterCreationQueue.name,
    {
        redis: queueConfig.redis,
        defaultJobOptions: queueConfig.defaultJobOptions,
        limiter: queueConfig.characterCreationQueue.limiter,
        settings: queueConfig.characterCreationQueue.settings
    }
);

// Event listeners
characterCreationQueue.on('completed', (job, result) => {
    logger.info(`✅ Job ${job.id} completed successfully`, {
        jobId: job.id,
        characterId: result.characterId,
        duration: Date.now() - job.timestamp
    });
});

characterCreationQueue.on('failed', (job, err) => {
    logger.error(`❌ Job ${job.id} failed`, {
        jobId: job.id,
        error: err.message,
        attempts: job.attemptsMade,
        data: job.data
    });
});

characterCreationQueue.on('progress', (job, progress) => {
    logger.info(`⏳ Job ${job.id} progress: ${progress}%`);
});

characterCreationQueue.on('stalled', (job) => {
    logger.warn(`⚠️ Job ${job.id} stalled`, {
        jobId: job.id,
        attempts: job.attemptsMade
    });
});

characterCreationQueue.on('error', (error) => {
    logger.error('❌ Queue error:', error);
});

characterCreationQueue.on('waiting', (jobId) => {
    logger.debug(`⏸️ Job ${jobId} is waiting`);
});

characterCreationQueue.on('active', (job) => {
    logger.info(`▶️ Job ${job.id} started processing`, {
        jobId: job.id,
        userId: job.data.userId
    });
});

/**
 * Add a character creation job to the queue
 * @param {Object} data - Character creation data
 * @param {string} data.userId - User ID
 * @param {Object} data.characterData - Character data
 * @returns {Promise<Job>} - Bull job instance
 */
async function addCharacterCreationJob(data) {
    try {
        const job = await characterCreationQueue.add(data, {
            priority: data.priority || 5, // Lower number = higher priority
            timeout: 300000, // 5 minutes timeout
            jobId: data.jobId // Use custom job ID if provided
        });

        logger.info(`📥 Added job to queue`, {
            jobId: job.id,
            userId: data.userId,
            queueLength: await characterCreationQueue.count()
        });

        return job;
    } catch (error) {
        logger.error('❌ Failed to add job to queue:', error);
        throw error;
    }
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Job>} - Bull job instance
 */
async function getJob(jobId) {
    return await characterCreationQueue.getJob(jobId);
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job status object
 */
async function getJobStatus(jobId) {
    const job = await getJob(jobId);

    if (!job) {
        return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;

    return {
        jobId: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp
    };
}

/**
 * Cancel a job
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function cancelJob(jobId) {
    const job = await getJob(jobId);

    if (!job) {
        throw new Error('Job not found');
    }

    const state = await job.getState();

    if (state === 'completed' || state === 'failed') {
        throw new Error(`Cannot cancel ${state} job`);
    }

    await job.remove();
    logger.info(`🗑️ Job ${jobId} cancelled`);
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} - Queue stats
 */
async function getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        characterCreationQueue.getWaitingCount(),
        characterCreationQueue.getActiveCount(),
        characterCreationQueue.getCompletedCount(),
        characterCreationQueue.getFailedCount(),
        characterCreationQueue.getDelayedCount()
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
    };
}

/**
 * Clean old jobs
 * @param {number} grace - Grace period in milliseconds
 * @returns {Promise<void>}
 */
async function cleanOldJobs(grace = 24 * 3600 * 1000) {
    await characterCreationQueue.clean(grace, 'completed');
    await characterCreationQueue.clean(7 * 24 * 3600 * 1000, 'failed');
    logger.info('🧹 Cleaned old jobs');
}

module.exports = {
    characterCreationQueue,
    addCharacterCreationJob,
    getJob,
    getJobStatus,
    cancelJob,
    getQueueStats,
    cleanOldJobs
};
