const { videoGenerationQueue } = require('../queues/mediaGeneration.queue');
const Character = require('../models/Character.model');
const CharacterMedia = require('../models/CharacterMedia.model');
const MediaGenerationJob = require('../models/MediaGenerationJob.model');
const logger = require('../utils/logger');
const queueConfig = require('../config/queue.config');

/**
 * Video Generation Worker
 * Processes video generation jobs from the queue
 */

videoGenerationQueue.process(queueConfig.workerConcurrency, async (job) => {
    const { userId, characterId, mediaId, duration, resolution, poseId, jobId } = job.data;

    logger.info(`🎬 Processing video generation job ${job.id}`, {
        jobId: job.id,
        characterId,
        mediaId
    });

    try {
        // Update job status
        await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'active',
                startedAt: new Date(),
                attemptsMade: job.attemptsMade + 1
            }
        );

        // Get character and media
        await job.progress(10);
        const character = await Character.findById(characterId);
        const media = await CharacterMedia.findById(mediaId);

        if (!character) {
            throw new Error('Character not found');
        }

        if (!media) {
            throw new Error('Media not found');
        }

        // Import video generation services
        const {
            uploadImageToWavespeed,
            submitVideoTask,
            pollVideoResult,
            downloadAndSaveVideo
        } = require('../services/videoGeneration.service');

        const { generateMotionPrompt } = require('../services/motionPromptGenerator.service');

        // Generate motion prompt
        await job.progress(20);
        logger.info(`🎭 Generating motion prompt for character: ${character.name}`);

        const motionPrompt = await generateMotionPrompt(
            character,
            poseId,
            character.description
        );

        logger.info(`✅ Motion prompt generated: ${motionPrompt}`);

        // Upload image to Wavespeed
        await job.progress(30);
        const imagePath = media.url.startsWith('http')
            ? media.url
            : `${process.env.BASE_URL || 'http://localhost:5000'}${media.url}`;

        const imageUrl = await uploadImageToWavespeed(imagePath);
        logger.info(`✅ Image uploaded to Wavespeed: ${imageUrl}`);

        // Submit video generation task
        await job.progress(40);
        const requestId = await submitVideoTask(imageUrl, motionPrompt, {
            duration: parseInt(duration) || 5,
            resolution: resolution || '720p'
        });

        logger.info(`✅ Video task submitted: ${requestId}`);

        // Poll for video result (this takes the longest)
        await job.progress(50);
        const videoUrl = await pollVideoResult(requestId, (progress) => {
            // Update job progress during polling (50-80%)
            const pollProgress = 50 + (progress * 0.3);
            job.progress(Math.min(pollProgress, 80));
        });

        logger.info(`✅ Video ready: ${videoUrl}`);

        // Download and save video
        await job.progress(85);
        const videoPath = await downloadAndSaveVideo(
            videoUrl,
            character.displayId,
            character.name
        );

        // Create video media entry
        await job.progress(95);
        const videoMedia = await CharacterMedia.create({
            characterId: character._id,
            userId: userId,
            mediaType: 'video',
            mediaUrl: videoPath,
            visibility: 'personal',
            prompt: motionPrompt,
            duration: parseInt(duration) || 5,
            generationParams: {
                resolution: resolution || '720p',
                sourceImageId: mediaId,
                wavespeedRequestId: requestId,
                generatedAt: new Date()
            }
        });

        // Update job status
        await job.progress(100);
        await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'completed',
                'result.mediaId': videoMedia._id,
                'result.url': videoPath,
                progress: 100,
                completedAt: new Date()
            }
        );

        logger.info(`✅ Video generation job completed: ${job.id}`);

        return {
            success: true,
            characterId: character._id,
            mediaId: videoMedia._id,
            videoUrl: videoPath
        };

    } catch (error) {
        logger.error(`❌ Video generation job failed: ${job.id}`, {
            jobId: job.id,
            error: error.message
        });

        await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'failed',
                'result.error': error.message,
                failedReason: error.message,
                attemptsMade: job.attemptsMade + 1
            }
        );

        throw error;
    }
});

logger.info(`🔧 Video generation worker started`);

module.exports = videoGenerationQueue;
