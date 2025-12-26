const { imageGenerationQueue } = require('../queues/mediaGeneration.queue');
const Character = require('../models/Character.model');
const CharacterMedia = require('../models/CharacterMedia.model');
const MediaGenerationJob = require('../models/MediaGenerationJob.model');
const logger = require('../utils/logger');
const { generateCharacterImage } = require('../services/aiImageGeneration.service');
const { populateCharacter } = require('../utils/characterHelper');
const queueConfig = require('../config/queue.config');

/**
 * Image Generation Worker
 * Processes AI image generation jobs from the queue
 */

imageGenerationQueue.process(queueConfig.workerConcurrency, async (job) => {
    const { userId, characterId, poseId, jobId } = job.data;
    const sseService = require('../services/sse.service');

    logger.info(`🎨 Processing image generation job ${job.id}`, {
        jobId: job.id,
        characterId,
        userId
    });

    try {
        // Update job status
        const updatedJob = await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'active',
                startedAt: new Date(),
                attemptsMade: job.attemptsMade + 1
            },
            { new: true }
        );

        // Broadcast SSE update
        sseService.broadcastJobUpdate(job.id.toString(), {
            status: 'active',
            progress: 0,
            startedAt: updatedJob.startedAt
        });

        // Get character
        await job.progress(20);
        sseService.broadcastJobUpdate(job.id.toString(), { progress: 20, status: 'active' });
        const character = await Character.findById(characterId);

        if (!character) {
            throw new Error('Character not found');
        }

        // Populate character data
        await job.progress(40);
        sseService.broadcastJobUpdate(job.id.toString(), { progress: 40, status: 'active' });
        const populatedCharacter = await populateCharacter(character);

        // Get pose object if poseId is provided
        let poseObject = null;
        if (poseId) {
            const CharacterPose = require('../models/CharacterPose.model');
            poseObject = await CharacterPose.findById(poseId);
            if (!poseObject) {
                logger.warn(`⚠️ Pose not found for ID: ${poseId}, using character's default pose`);
            } else {
                logger.info(`✅ Pose found: ${poseObject.name}`);
            }
        }

        // Use the fetched pose or fall back to character's default pose
        const finalPose = poseObject || populatedCharacter.personalityId?.poseId;

        // Generate image
        await job.progress(60);
        sseService.broadcastJobUpdate(job.id.toString(), { progress: 60, status: 'active' });
        logger.info(`🎨 Generating AI image for character: ${character.name}`);

        // Get occupation object (populated with name property)
        const occupation = populatedCharacter.personalityId?.occupationId || null;
        if (occupation) {
            logger.info(`✅ Occupation found: ${occupation.name || 'Unknown'}`);
        } else {
            logger.warn(`⚠️ No occupation found for character: ${character.name}`);
        }

        const result = await generateCharacterImage(
            {
                _id: character._id,
                displayId: character.displayId,
                name: character.name,
                age: character.age,
                gender: character.gender,
                description: character.description,
                ethnicity: populatedCharacter.physicalAttributesId?.ethnicity,
                bodyType: populatedCharacter.physicalAttributesId?.bodyType,
                hairColor: populatedCharacter.physicalAttributesId?.hairColor,
                hairStyle: populatedCharacter.physicalAttributesId?.hairStyle,
                eyeColor: populatedCharacter.physicalAttributesId?.eyeColor,
                skinColor: populatedCharacter.physicalAttributesId?.skinColor,
                breastSize: populatedCharacter.physicalAttributesId?.breastSize,
                buttSize: populatedCharacter.physicalAttributesId?.buttSize,
                muscleTone: populatedCharacter.physicalAttributesId?.muscleTone,
                height: populatedCharacter.physicalAttributesId?.height
            },
            finalPose,  // Pass the pose object (with name property)
            occupation  // Pass occupation object (with name property) or null
        );

        // Check if we have either imagePath or cloudinaryUrl
        if (!result?.imagePath && !result?.cloudinaryUrl) {
            throw new Error('Image generation failed - no image URL returned');
        }

        const imageUrlForLog = result.cloudinaryUrl || result.imagePath;
        logger.info(`✅ Image generated: ${imageUrlForLog}`);

        // Create CharacterMedia entry
        await job.progress(80);
        sseService.broadcastJobUpdate(job.id.toString(), { progress: 80, status: 'active' });
        // Use cloudinaryUrl if available, otherwise fall back to imagePath
        const imageUrl = result.cloudinaryUrl || result.imagePath;
        
        const media = await CharacterMedia.create({
            characterId: character._id,
            userId: userId,
            mediaType: 'image',
            mediaUrl: imageUrl,
            visibility: 'personal',
            prompt: result.promptUsed,
            generationParams: {
                model: 'flux-dev',
                pose: result.pose,
                poseCategory: result.poseCategory,
                cloudinaryPublicId: result.cloudinaryPublicId,
                cloudinaryUrl: result.cloudinaryUrl,
                uploadPath: result.uploadPath,
                fileSizeKb: result.fileSizeKb,
                format: result.format,
                quality: result.quality,
                generatedAt: new Date()
            }
        });

        logger.info(`✅ CharacterMedia created: ${media._id}`);

        // Update character display images
        await job.progress(90);
        sseService.broadcastJobUpdate(job.id.toString(), { progress: 90, status: 'active' });
        // Reuse imageUrl from above (already declared at line 106)
        
        if (imageUrl) {
            character.displayImageUrls = character.displayImageUrls || [];
            if (!character.displayImageUrls.includes(imageUrl)) {
                character.displayImageUrls.push(imageUrl);
                await character.save();
                logger.info(`✅ Character displayImageUrls updated: ${character.displayImageUrls.length} images`);
                logger.info(`   Image URL: ${imageUrl}`);
            } else {
                logger.info(`ℹ️  Image URL already in displayImageUrls: ${imageUrl}`);
            }
        } else {
            logger.warn(`⚠️ No image URL returned from generation result`);
        }

        // Update job status
        await job.progress(100);
        // Reuse imageUrl from above (already declared at line 106)
        
        const completedJob = await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'completed',
                'result.mediaId': media._id,
                'result.url': imageUrl,
                'result.cloudinaryUrl': result.cloudinaryUrl,
                'result.cloudinaryPublicId': result.cloudinaryPublicId,
                progress: 100,
                completedAt: new Date()
            },
            { new: true }
        );

        // Broadcast completion via SSE
        sseService.broadcastJobUpdate(job.id.toString(), {
            status: 'completed',
            progress: 100,
            result: {
                mediaId: media._id,
                url: imageUrl,
                cloudinaryUrl: result.cloudinaryUrl
            },
            completedAt: completedJob.completedAt
        });

        logger.info(`✅ Image generation job completed: ${job.id}`, {
            mediaId: media._id,
            imageUrl: imageUrl,
            cloudinaryUrl: result.cloudinaryUrl
        });

        return {
            success: true,
            characterId: character._id,
            mediaId: media._id,
            imageUrl: result.imagePath
        };

    } catch (error) {
        logger.error(`❌ Image generation job failed: ${job.id}`, {
            jobId: job.id,
            error: error.message
        });

        const failedJob = await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'failed',
                'result.error': error.message,
                failedReason: error.message,
                attemptsMade: job.attemptsMade + 1
            },
            { new: true }
        );

        // Broadcast failure via SSE
        sseService.broadcastJobUpdate(job.id.toString(), {
            status: 'failed',
            failedReason: error.message,
            result: {
                error: error.message
            }
        });

        throw error;
    }
});

logger.info(`🔧 Image generation worker started`);

module.exports = imageGenerationQueue;
