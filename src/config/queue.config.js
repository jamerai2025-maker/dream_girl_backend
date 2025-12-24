const logger = require('../utils/logger');

/**
 * Queue Configuration
 * Redis connection settings and queue options
 */

const queueConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    },

    // Default job options
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000 // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600 // Keep failed jobs for 7 days
        }
    },

    // Character creation queue specific options
    characterCreationQueue: {
        name: 'character-creation',
        limiter: {
            max: 10, // Max 10 jobs
            duration: 1000 // per second
        },
        settings: {
            lockDuration: 300000, // 5 minutes - max time a job can run
            stalledInterval: 30000, // Check for stalled jobs every 30 seconds
            maxStalledCount: 2 // Retry stalled jobs twice
        }
    },

    // Worker concurrency
    workerConcurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5
};

logger.info('📋 Queue configuration loaded', {
    redis: `${queueConfig.redis.host}:${queueConfig.redis.port}`,
    concurrency: queueConfig.workerConcurrency
});

module.exports = queueConfig;
