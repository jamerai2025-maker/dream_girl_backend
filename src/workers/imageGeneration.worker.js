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

    logger.info(`🎨 Processing image generation job ${job.id}`, {
        jobId: job.id,
        characterId,
        userId
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

        // Get character
        await job.progress(20);
        const character = await Character.findById(characterId);

        if (!character) {
            throw new Error('Character not found');
        }

        // Populate character data
        await job.progress(40);
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
        logger.info(`🎨 Generating AI image for character: ${character.name}`);

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
            populatedCharacter.personalityId?.occupationId  // Add occupation as 3rd parameter
        );

        if (!result?.imagePath) {
            throw new Error('Image generation failed - no image path returned');
        }

        logger.info(`✅ Image generated: ${result.imagePath}`);

        // Create CharacterMedia entry
        await job.progress(80);
        const media = await CharacterMedia.create({
            characterId: character._id,
            userId: userId,
            mediaType: 'image',
            mediaUrl: result.imagePath,
            visibility: 'personal',
            prompt: result.promptUsed,
            generationParams: {
                model: 'flux-dev',
                pose: result.pose,
                poseCategory: result.poseCategory,
                generatedAt: new Date()
            }
        });

        logger.info(`✅ CharacterMedia created: ${media._id}`);

        // Update character display images
        await job.progress(90);
        character.displayImageUrls = character.displayImageUrls || [];
        if (!character.displayImageUrls.includes(result.imagePath)) {
            character.displayImageUrls.push(result.imagePath);
            await character.save();
            logger.info(`✅ Character displayImageUrls updated: ${character.displayImageUrls.length} images`);
        }

        // Update job status
        await job.progress(100);
        await MediaGenerationJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'completed',
                'result.mediaId': media._id,
                'result.url': result.imagePath,
                progress: 100,
                completedAt: new Date()
            }
        );

        logger.info(`✅ Image generation job completed: ${job.id}`, {
            mediaId: media._id,
            imageUrl: result.imagePath
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

logger.info(`🔧 Image generation worker started`);

module.exports = imageGenerationQueue;
