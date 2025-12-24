#!/usr/bin/env node
/**
 * Update Pose Prompts Script
 * 
 * This script updates all pose prompts in the database with clean prompts
 * from the prompt.json file (removes old "masterpiece, best quality" format)
 * 
 * Usage: node src/scripts/updatePosePrompts.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import CharacterPose model
const CharacterPose = require('../models/CharacterPose.model');

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        // Use MONGO_URI from environment (includes auth)
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/nova_ai_db';
        console.log(`Connecting to MongoDB...`);

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

/**
 * Load prompts from prompt.json
 */
function loadPrompts() {
    const promptPath = path.join(__dirname, '../prompt.json');
    const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf8'));

    // Category mapping: prompt.json -> database enum
    const categoryMap = {
        'community': 'Community',
        'body_focus': 'Body Focus',
        'masturbation': 'Masturbation',
        'oral': 'Oral',
        'intercourse': 'Intercourse',
        'group': 'Group',
        'bdsm': 'BDSM',
        'aftermath': 'Aftermath',
        'misc': 'Miscellaneous'
    };

    // Flatten all categories into a single object
    const allPrompts = {};

    for (const [category, poses] of Object.entries(promptData)) {
        const dbCategory = categoryMap[category] || category;

        for (const [poseName, prompt] of Object.entries(poses)) {
            allPrompts[poseName] = {
                category: dbCategory,
                prompt: prompt
            };
        }
    }

    return allPrompts;
}

/**
 * Update poses in database
 */
async function updatePoses() {
    console.log('\n🚀 Starting pose prompt update...\n');

    try {
        // Load prompts from file
        const prompts = loadPrompts();
        console.log(`📋 Loaded ${Object.keys(prompts).length} poses from prompt.json\n`);

        // Get all poses from database
        const dbPoses = await CharacterPose.find({});
        console.log(`📊 Found ${dbPoses.length} poses in database\n`);

        let updatedCount = 0;
        let notFoundCount = 0;

        // Update each pose
        for (const pose of dbPoses) {
            const promptData = prompts[pose.name];

            if (promptData) {
                // Update the pose
                pose.prompt = promptData.prompt;
                pose.category = promptData.category;
                await pose.save();

                console.log(`✅ Updated: ${pose.name} (${promptData.category})`);
                console.log(`   Old: ${pose.prompt.substring(0, 60)}...`);
                console.log(`   New: ${promptData.prompt.substring(0, 60)}...\n`);

                updatedCount++;
            } else {
                console.log(`⚠️  Not found in prompt.json: ${pose.name}`);
                notFoundCount++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Update Complete!`);
        console.log(`   Updated: ${updatedCount} poses`);
        console.log(`   Not found: ${notFoundCount} poses`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Update failed:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        await connectDB();
        await updatePoses();
        console.log('\n✅ All done!\n');
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

module.exports = { updatePoses };
