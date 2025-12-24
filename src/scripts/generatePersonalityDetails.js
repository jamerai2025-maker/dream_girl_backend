#!/usr/bin/env node
/**
 * Generate AI Personality Details for Existing Characters
 * 
 * This script updates existing characters with AI-generated personalityDetails
 * based on their hobby, occupation, relationship, fetish, and pose data.
 * 
 * Usage: node src/scripts/generatePersonalityDetails.js
 */

const mongoose = require('mongoose');
const CharacterPersonality = require('../models/CharacterPersonality.model');
const { generatePersonalityDetails } = require('../services/aiPersonality.service');
require('dotenv').config();

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/nova_ai_db';
        console.log(`Connecting to MongoDB...`);

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

/**
 * Generate personality details for all characters
 */
async function generateForExistingCharacters() {
    console.log('🚀 Starting AI personality generation for existing characters...\n');

    try {
        // Find all personalities that don't have personalityDetails or have empty ones
        const personalities = await CharacterPersonality.find({
            $or: [
                { personalityDetails: { $exists: false } },
                { personalityDetails: null },
                { personalityDetails: '' }
            ]
        })
            .populate('hobbyId')
            .populate('occupationId')
            .populate('relationshipId')
            .populate('fetishId')
            .populate('poseId');

        console.log(`📊 Found ${personalities.length} characters without AI-generated personality details\n`);

        if (personalities.length === 0) {
            console.log('✅ All characters already have personality details!\n');
            return;
        }

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const personality of personalities) {
            try {
                // Build personality data
                const personalityData = {
                    personality: personality.personality,
                    hobby: personality.hobbyId?.name,
                    occupation: personality.occupationId?.name,
                    relationship: personality.relationshipId?.name,
                    fetish: personality.fetishId?.name,
                    pose: personality.poseId?.name
                };

                // Check if we have any data to work with
                const hasData = Object.values(personalityData).some(val => val);

                if (!hasData) {
                    console.log(`⏭️  Skipping ${personality._id} - no personality data available`);
                    skipCount++;
                    continue;
                }

                console.log(`🤖 Generating for personality ${personality._id}...`);
                console.log(`   Traits: ${Object.entries(personalityData)
                    .filter(([_, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}`);

                // Generate AI personality details
                const aiPersonalityDetails = await generatePersonalityDetails(personalityData);

                if (aiPersonalityDetails) {
                    // Update the personality
                    personality.personalityDetails = aiPersonalityDetails;
                    await personality.save();

                    console.log(`✅ Generated: "${aiPersonalityDetails.substring(0, 80)}..."\n`);
                    successCount++;
                } else {
                    console.log(`⚠️  No details generated\n`);
                    skipCount++;
                }

                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error for ${personality._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Migration Complete!');
        console.log(`   Success: ${successCount} personalities updated`);
        console.log(`   Skipped: ${skipCount} personalities`);
        console.log(`   Errors: ${errorCount} personalities`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        await connectDB();
        await generateForExistingCharacters();
        console.log('✅ All done!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateForExistingCharacters };
