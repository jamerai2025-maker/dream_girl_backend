// src/utils/characterHelper.js - Helper functions for character data transformation with separate collections
const CharacterPhysicalAttributes = require('../models/CharacterPhysicalAttributes.model');
const CharacterPersonality = require('../models/CharacterPersonality.model');
const CharacterAIGeneration = require('../models/CharacterAIGeneration.model');
const CharacterChatConfig = require('../models/CharacterChatConfig.model');
const CharacterCategorization = require('../models/CharacterCategorization.model');
const CharacterStatistics = require('../models/CharacterStatistics.model');

/**
 * Create linked documents for a character
 * Returns object with all created document IDs
 */
const createLinkedDocuments = async (characterId, data) => {
    const linkedDocs = {};

    // Create Physical Attributes - check for ANY physical attribute field
    const hasPhysicalAttrs = data.physicalAttributes ||
        data.style ||
        data.ethnicity ||
        data.skinColor ||
        data.skin_tone ||
        data.eyeColor ||
        data.eye_color ||
        data.hairColor ||
        data.hair_color ||
        data.hairStyle ||
        data.hair_style ||
        data.bodyType ||
        data.body_type ||
        data.breastSize ||
        data.breast_size ||
        data.buttSize ||
        data.butt_size;

    if (hasPhysicalAttrs) {
        const physicalData = data.physicalAttributes || {
            style: data.style,
            ethnicity: data.ethnicity,
            skinColor: data.skinColor || data.skin_tone,
            eyeColor: data.eyeColor || data.eye_color,
            hairColor: data.hairColor || data.hair_color,
            hairStyle: data.hairStyle || data.hair_style,
            bodyType: data.bodyType || data.body_type,
            breastSize: data.breastSize || data.breast_size,
            buttSize: data.buttSize || data.butt_size
        };

        const physicalAttrs = await CharacterPhysicalAttributes.create({
            characterId,
            ...physicalData
        });
        linkedDocs.physicalAttributesId = physicalAttrs._id;
    }

    // Create Personality
    if (data.personalityTraits || data.personality || data.voice || data.occupation) {
        // Handle both old format (individual fields) and new format (personality object)
        let personalityData;

        if (typeof data.personality === 'object' && data.personality !== null) {
            // New format: personality is an object with all fields
            personalityData = {
                personality: data.personality.personality,
                personalityDetails: data.personality.personalityDetails,
                voice: data.personality.voice,
                occupationId: data.personality.occupationId,
                hobbyId: data.personality.hobbyId,
                relationshipId: data.personality.relationshipId,
                fetishId: data.personality.fetishId,
                poseId: data.personality.poseId
            };
        } else {
            // Old format: individual fields
            personalityData = data.personalityTraits || {
                personality: data.personality,
                personalityDetails: data.personalityDetails,
                voice: data.voice,
                occupationId: data.occupationId,
                hobbyId: data.hobbyId,
                relationshipId: data.relationshipId,
                fetishId: data.fetishId,
                poseId: data.poseId
            };
        }

        const personality = await CharacterPersonality.create({
            characterId,
            ...personalityData
        });
        linkedDocs.personalityId = personality._id;
    }

    // Create AI Generation
    if (data.aiGeneration || data.characterImagePrompt || data.model) {
        const aiData = data.aiGeneration || {
            characterImagePrompt: data.characterImagePrompt,
            faceTunerPrompt: data.faceTunerPrompt,
            faceTunerCfg: data.faceTunerCfg,
            rawFacePrompt: data.rawFacePrompt,
            displayImageFeatures: data.displayImageFeatures,
            customFeatures: data.customFeatures,
            createdWithAI: data.createdWithAI,
            model: data.model
        };

        const aiGen = await CharacterAIGeneration.create({
            characterId,
            ...aiData
        });
        linkedDocs.aiGenerationId = aiGen._id;
    }

    // Create Chat Config
    if (data.chatConfig || data.initialMessages || data.scenario) {
        const chatData = data.chatConfig || {
            initialMessages: data.initialMessages,
            exampleResponses: data.exampleResponses,
            scenario: data.scenario,
            firstReplySuggestion: data.firstReplySuggestion
        };

        const chatConfig = await CharacterChatConfig.create({
            characterId,
            ...chatData
        });
        linkedDocs.chatConfigId = chatConfig._id;
    }

    // Create Categorization (always create with defaults)
    const categorizationData = data.categorization || {
        tags: data.tags,
        mainCategory: data.mainCategory,
        visibility: data.visibility,
        hidden: data.hidden
    };

    const categorization = await CharacterCategorization.create({
        characterId,
        ...categorizationData
    });
    linkedDocs.categorizationId = categorization._id;

    // Create Statistics (always create with defaults)
    const statistics = await CharacterStatistics.create({
        characterId,
        messageCount: 0,
        likeCount: 0,
        viewCount: 0
    });
    linkedDocs.statisticsId = statistics._id;

    return linkedDocs;
};

/**
 * Populate character with all linked documents
 */
const populateCharacter = async (character) => {
    if (!character) return null;

    return await character.populate([
        { path: 'physicalAttributesId', select: '-characterId -createdAt -updatedAt' },
        {
            path: 'personalityId',
            select: '-characterId -createdAt -updatedAt',
            populate: [
                { path: 'occupationId', select: 'name emoji' },
                { path: 'hobbyId', select: 'name emoji' },
                { path: 'relationshipId', select: 'name emoji' },
                { path: 'fetishId', select: 'name emoji' },
                { path: 'poseId', select: 'name emoji prompt category' }
            ]
        },
        { path: 'aiGenerationId', select: '-characterId -createdAt -updatedAt' },
        { path: 'chatConfigId', select: '-characterId -createdAt -updatedAt' },
        { path: 'categorizationId', select: '-characterId -createdAt -updatedAt' },
        { path: 'statisticsId', select: '-characterId -createdAt -updatedAt' },
        { path: 'createdByUserId', select: 'name avatar username bio' }
    ]);
};

/**
 * Flatten character data for API response (backward compatibility)
 */
const flattenCharacterData = (character) => {
    if (!character) return null;

    const obj = character.toObject ? character.toObject() : character;

    return {
        ...obj,
        // Flatten physical attributes
        style: obj.physicalAttributesId?.style,
        ethnicity: obj.physicalAttributesId?.ethnicity,
        skinColor: obj.physicalAttributesId?.skinColor,
        skin_tone: obj.physicalAttributesId?.skinColor,
        eyeColor: obj.physicalAttributesId?.eyeColor,
        eye_color: obj.physicalAttributesId?.eyeColor,
        hairColor: obj.physicalAttributesId?.hairColor,
        hair_color: obj.physicalAttributesId?.hairColor,
        hairStyle: obj.physicalAttributesId?.hairStyle,
        hair_style: obj.physicalAttributesId?.hairStyle,
        bodyType: obj.physicalAttributesId?.bodyType,
        body_type: obj.physicalAttributesId?.bodyType,
        breastSize: obj.physicalAttributesId?.breastSize,
        breast_size: obj.physicalAttributesId?.breastSize,
        buttSize: obj.physicalAttributesId?.buttSize,
        butt_size: obj.physicalAttributesId?.buttSize,

        // Flatten personality
        personality: obj.personalityId?.personality,
        personalityDetails: obj.personalityId?.personalityDetails,
        voice: obj.personalityId?.voice,
        occupation: obj.personalityId?.occupation,
        relationship: obj.personalityId?.relationship,
        hobby: obj.personalityId?.hobby,
        fetish: obj.personalityId?.fetish,

        // Flatten AI generation
        characterImagePrompt: obj.aiGenerationId?.characterImagePrompt,
        faceTunerPrompt: obj.aiGenerationId?.faceTunerPrompt,
        faceTunerCfg: obj.aiGenerationId?.faceTunerCfg,
        rawFacePrompt: obj.aiGenerationId?.rawFacePrompt,
        displayImageFeatures: obj.aiGenerationId?.displayImageFeatures,
        customFeatures: obj.aiGenerationId?.customFeatures,
        createdWithAI: obj.aiGenerationId?.createdWithAI,
        model: obj.aiGenerationId?.model,

        // Flatten chat config
        initialMessages: obj.chatConfigId?.initialMessages,
        exampleResponses: obj.chatConfigId?.exampleResponses,
        scenario: obj.chatConfigId?.scenario,
        firstReplySuggestion: obj.chatConfigId?.firstReplySuggestion,

        // Flatten categorization
        tags: obj.categorizationId?.tags,
        mainCategory: obj.categorizationId?.mainCategory,
        visibility: obj.categorizationId?.visibility,
        hidden: obj.categorizationId?.hidden,

        // Flatten statistics
        messageCount: obj.statisticsId?.messageCount,
        likeCount: obj.statisticsId?.likeCount,
        viewCount: obj.statisticsId?.viewCount
    };
};

/**
 * Delete all linked documents for a character
 */
const deleteLinkedDocuments = async (characterId) => {
    await Promise.all([
        CharacterPhysicalAttributes.deleteOne({ characterId }),
        CharacterPersonality.deleteOne({ characterId }),
        CharacterAIGeneration.deleteOne({ characterId }),
        CharacterChatConfig.deleteOne({ characterId }),
        CharacterCategorization.deleteOne({ characterId }),
        CharacterStatistics.deleteOne({ characterId })
    ]);
};

module.exports = {
    createLinkedDocuments,
    populateCharacter,
    flattenCharacterData,
    deleteLinkedDocuments
};
