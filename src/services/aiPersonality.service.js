// src/services/aiPersonality.service.js - AI Personality Generation Service using Groq

const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Generate detailed personality description using Groq API
 * @param {Object} personalityData - Personality data object
 * @param {string} personalityData.personality - Personality type/traits
 * @param {string} personalityData.hobby - Hobby name
 * @param {string} personalityData.occupation - Occupation name
 * @param {string} personalityData.relationship - Relationship type
 * @param {string} personalityData.fetish - Fetish preference
 * @param {string} personalityData.pose - Pose preference
 * @returns {Promise<string|null>} - Generated personality details or null on error
 */
const generatePersonalityDetails = async (personalityData) => {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        const groqApiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
        const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

        if (!groqApiKey) {
            logger.warn('GROQ_API_KEY not set, skipping AI personality generation');
            return null;
        }

        // Build personality context from available data
        const personalityTraits = [];
        if (personalityData.personality) personalityTraits.push(`Personality: ${personalityData.personality}`);
        if (personalityData.hobby) personalityTraits.push(`Hobby: ${personalityData.hobby}`);
        if (personalityData.occupation) personalityTraits.push(`Occupation: ${personalityData.occupation}`);
        if (personalityData.relationship) personalityTraits.push(`Relationship Style: ${personalityData.relationship}`);
        if (personalityData.fetish) personalityTraits.push(`Fetish: ${personalityData.fetish}`);
        if (personalityData.pose) personalityTraits.push(`Preferred Pose: ${personalityData.pose}`);

        if (personalityTraits.length === 0) {
            logger.warn('No personality data provided for AI generation');
            return null;
        }

        const personalityContext = personalityTraits.join('\n');

        // Create the prompt for personality generation
        const systemPrompt = `You are an expert character personality writer. Generate a detailed, engaging personality description based on the provided traits. Make it vivid, specific, and immersive. Focus on how these traits manifest in behavior, speech patterns, interests, and interactions.`;

        const userPrompt = `Based on the following character traits, write a comprehensive personality description (2-4 paragraphs, 200-400 words):

${personalityContext}

Write a detailed personality description that brings this character to life. Include:
- Core personality traits and how they manifest
- Communication style and speech patterns
- Interests and passions
- How they interact with others
- Unique quirks and characteristics
- Emotional depth and complexity

Make it engaging, specific, and immersive.`;

        // Call Groq API
        const response = await axios.post(
            groqApiUrl,
            {
                model: groqModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 500,
                top_p: 0.9,
                frequency_penalty: 0.3,
                presence_penalty: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const generatedText = response.data?.choices?.[0]?.message?.content?.trim();

        if (!generatedText) {
            logger.warn('Groq API returned empty response');
            return null;
        }

        logger.info(`✅ AI personality generated successfully (${generatedText.length} chars)`);
        return generatedText;

    } catch (error) {
        if (error.response) {
            logger.error(`Groq API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        } else if (error.request) {
            logger.error(`Groq API request failed: ${error.message}`);
        } else {
            logger.error(`Personality generation error: ${error.message}`);
        }
        return null;
    }
};

module.exports = {
    generatePersonalityDetails
};


