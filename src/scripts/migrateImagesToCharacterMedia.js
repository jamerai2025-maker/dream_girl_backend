#!/usr/bin/env node
/**
 * Migrate Existing Images to CharacterMedia Collection
 * 
 * This script creates CharacterMedia records for all existing images
 * in the displayImageUrls array of characters.
 * 
 * Usage: node src/scripts/migrateImagesToCharacterMedia.js
 */

const mongoose = require('mongoose');
const Character = require('../models/Character.model');
const CharacterMedia = require('../models/CharacterMedia.model');
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
 * Migrate existing images to CharacterMedia
 */
async function migrateImages() {
    console.log('🚀 Starting image migration to CharacterMedia...\n');

    try {
        // Find all characters with displayImageUrls
        const characters = await Character.find({
            displayImageUrls: { $exists: true, $ne: [] }
        });

        console.log(`📊 Found ${characters.length} characters with images\n`);

        if (characters.length === 0) {
            console.log('✅ No characters with images found!\n');
            return;
        }

        let totalImages = 0;
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const character of characters) {
            try {
                console.log(`\n📸 Processing character: ${character.name} (${character._id})`);
                console.log(`   Images: ${character.displayImageUrls.length}`);

                for (const imageUrl of character.displayImageUrls) {
                    totalImages++;

                    try {
                        // Check if CharacterMedia record already exists for this image
                        const existingMedia = await CharacterMedia.findOne({
                            characterId: character._id,
                            mediaUrl: imageUrl
                        });

                        if (existingMedia) {
                            console.log(`   ⏭️  Skipping (already exists): ${imageUrl}`);
                            skipCount++;
                            continue;
                        }

                        // Create CharacterMedia record
                        await CharacterMedia.create({
                            characterId: character._id,
                            userId: character.createdByUserId,
                            mediaType: 'image',
                            mediaUrl: imageUrl,
                            visibility: 'personal',
                            prompt: null,  // No prompt available for old images
                            generationParams: {
                                migrated: true,
                                migratedAt: new Date(),
                                note: 'Migrated from displayImageUrls - no prompt available'
                            }
                        });

                        console.log(`   ✅ Created CharacterMedia: ${imageUrl}`);
                        successCount++;

                    } catch (error) {
                        console.error(`   ❌ Error processing image ${imageUrl}:`, error.message);
                        errorCount++;
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing character ${character._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ Migration Complete!');
        console.log(`   Total images processed: ${totalImages}`);
        console.log(`   Successfully migrated: ${successCount}`);
        console.log(`   Skipped (already exist): ${skipCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log('='.repeat(80) + '\n');

        // Show summary
        const totalMediaRecords = await CharacterMedia.countDocuments();
        console.log(`📊 Total CharacterMedia records in database: ${totalMediaRecords}\n`);

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
        await migrateImages();
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

module.exports = { migrateImages };
