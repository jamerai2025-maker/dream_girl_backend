const { characterCreationQueue } = require('../queues/characterCreation.queue');
const Character = require('../models/Character.model');
const CharacterJob = require('../models/CharacterJob.model');
const CharacterMedia = require('../models/CharacterMedia.model');
const CharacterPersonality = require('../models/CharacterPersonality.model');
const logger = require('../utils/logger');
const { createLinkedDocuments, populateCharacter } = require('../utils/characterHelper');
const { generateCharacterImage } = require('../services/aiImageGeneration.service');
const { generatePersonalityDetails } = require('../services/aiPersonality.service');
const queueConfig = require('../config/queue.config');

/**
 * Character Creation Worker
 * Processes character creation jobs from the queue
 */

// Process character creation jobs
characterCreationQueue.process(queueConfig.workerConcurrency, async (job) => {
    const { userId, characterData, jobId } = job.data;

    logger.info(`🔨 Processing character creation job ${job.id}`, {
        jobId: job.id,
        userId,
        characterName: characterData.name
    });

    try {
        // Update job status to active
        await CharacterJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'active',
                startedAt: new Date(),
                attemptsMade: job.attemptsMade + 1
            }
        );

        // Step 1: Create main character document (10% progress)
        await job.progress(10);
        const character = await Character.create({
            name: characterData.name,
            age: characterData.age,
            gender: characterData.gender,
            description: characterData.description,
            shortDescription: characterData.shortDescription,
            displayImageUrls: characterData.displayImageUrls || [],
            audioPack: characterData.audioPack,
            createdByUserId: userId,
            extraDetails: characterData.extraDetails
        });

        logger.info(`✅ Character document created: ${character._id}`);

        // Step 2: Create linked documents (30% progress)
        await job.progress(30);
        const linkedDocs = await createLinkedDocuments(character._id, characterData);
        Object.assign(character, linkedDocs);
        await character.save();

        logger.info(`✅ Linked documents created for character: ${character._id}`);

        // Step 3: Populate character (40% progress)
        await job.progress(40);
        let populatedCharacter = await populateCharacter(character);

        // Step 4: Generate AI personality (60% progress)
        await job.progress(60);
        if (populatedCharacter.personalityId) {
            try {
                logger.info(`🤖 Generating AI personality for: ${character.name}`);

                const personalityData = {
                    personality: populatedCharacter.personalityId.personality,
                    hobby: populatedCharacter.personalityId.hobbyId?.name,
                    occupation: populatedCharacter.personalityId.occupationId?.name,
                    relationship: populatedCharacter.personalityId.relationshipId?.name,
                    fetish: populatedCharacter.personalityId.fetishId?.name,
                    pose: populatedCharacter.personalityId.poseId?.name
                };

                const aiPersonalityDetails = await generatePersonalityDetails(personalityData);

                if (aiPersonalityDetails) {
                    await CharacterPersonality.findByIdAndUpdate(
                        populatedCharacter.personalityId._id,
                        { personalityDetails: aiPersonalityDetails }
                    );
                    populatedCharacter.personalityId.personalityDetails = aiPersonalityDetails;
                    logger.info(`✅ AI personality generated`);
                }
            } catch (err) {
                logger.error(`❌ AI personality generation failed:`, err.message);
            }
        }

        // Step 5: Generate AI image (80% progress)
        await job.progress(80);
        const aiGenerationEnabled = process.env.AI_GENERATION_ENABLED === 'true';

        if (aiGenerationEnabled && populatedCharacter.personalityId?.poseId) {
            try {
                logger.info(`🎨 Starting AI image generation for: ${character.name}`);

                // Debug: Log what data we have before generating image
                logger.info(`\n🔍 DEBUG - Data available for image generation:`);
                logger.info(`   Ethnicity from physicalAttributesId: ${populatedCharacter.physicalAttributesId?.ethnicity}`);
                logger.info(`   Occupation object: ${JSON.stringify(populatedCharacter.personalityId.occupationId)}`);
                logger.info(`   Occupation name: ${populatedCharacter.personalityId.occupationId?.name}`);
                logger.info(`   Pose object: ${JSON.stringify(populatedCharacter.personalityId.poseId)}`);
                logger.info(`   Pose name: ${populatedCharacter.personalityId.poseId?.name}\n`);

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
                    populatedCharacter.personalityId.poseId,
                    populatedCharacter.personalityId.occupationId  // Add occupation as 3rd parameter
                );

                if (result?.imagePath) {
                    logger.info(`✅ Image generated: ${result.imagePath}`);

                    try {
                        // Create CharacterMedia entry
                        logger.info(`📝 Step 1: Creating CharacterMedia document for character ${character._id}...`);
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

                        logger.info(`✅ CharacterMedia created successfully: ${media._id}`);

                        // Update character with display image
                        logger.info(`📝 Step 2: Updating Character.displayImageUrls array...`);
                        character.displayImageUrls = character.displayImageUrls || [];
                        if (!character.displayImageUrls.includes(result.imagePath)) {
                            character.displayImageUrls.push(result.imagePath);
                        }

                        logger.info(`📝 Step 3: Saving character document...`);
                        await character.save();

                        logger.info(`✅ AI image saved to database successfully: ${result.imagePath}`);
                    } catch (dbError) {
                        logger.error(`❌ DATABASE SAVE ERROR:`, {
                            errorMessage: dbError.message,
                            errorName: dbError.name,
                            errorCode: dbError.code,
                            stack: dbError.stack
                        });
                        throw dbError;
                    }
                }
            } catch (err) {
                logger.error(`❌ AI image generation failed:`, {
                    message: err.message,
                    stack: err.stack,
                    error: err
                });
            }
        }

        // Step 6: Finalize (100% progress)
        await job.progress(100);

        // Update job status to completed
        await CharacterJob.findOneAndUpdate(
            { jobId: job.id.toString() },
            {
                status: 'completed',
                'result.characterId': character._id,
                progress: 100,
                completedAt: new Date()
            }
        );

        logger.info(`✅ Character creation job completed: ${job.id}`, {
            jobId: job.id,
            characterId: character._id,
            duration: Date.now() - job.timestamp
        });

        // Return result
        return {
            success: true,
            characterId: character._id,
            displayId: character.displayId,
            name: character.name
        };

    } catch (error) {
        logger.error(`❌ Character creation job failed: ${job.id}`, {
            jobId: job.id,
            error: error.message,
            stack: error.stack
        });

        // Update job status to failed
        await CharacterJob.findOneAndUpdate(
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

logger.info(`🔧 Character creation worker started with concurrency: ${queueConfig.workerConcurrency}`);

module.exports = characterCreationQueue;
