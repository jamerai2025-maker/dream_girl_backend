#!/usr/bin/env node
/**
 * Migration Script: Reorganize Character Images
 * 
 * This script migrates existing character images from:
 *   public/assets/characters/{filename}.png
 * To:
 *   public/assets/character/{character_name}/{filename}.png
 * 
 * Usage: node src/scripts/migrateCharacterImages.js
 */

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Character = require('../models/Character.model');

const OLD_DIR = path.join(__dirname, '../../public/assets/characters');
const NEW_BASE_DIR = path.join(__dirname, '../../public/assets/character');

/**
 * Sanitize character name for filesystem
 */
function sanitizeName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/novaai', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

/**
 * Migrate images for a single character
 */
async function migrateCharacterImages(character) {
    try {
        const sanitizedName = sanitizeName(character.name);
        const characterDir = path.join(NEW_BASE_DIR, sanitizedName);

        // Create character directory
        await fs.mkdir(characterDir, { recursive: true });

        let updatedUrls = [];
        let migrationCount = 0;

        for (const imageUrl of character.displayImageUrls || []) {
            // Check if it's an old-style URL
            if (imageUrl.startsWith('/assets/characters/')) {
                const filename = path.basename(imageUrl);
                const oldPath = path.join(OLD_DIR, filename);
                const newPath = path.join(characterDir, filename);
                const newUrl = `/assets/character/${sanitizedName}/${filename}`;

                try {
                    // Check if old file exists
                    await fs.access(oldPath);

                    // Copy file to new location
                    await fs.copyFile(oldPath, newPath);

                    updatedUrls.push(newUrl);
                    migrationCount++;

                    console.log(`  ✓ Migrated: ${filename}`);
                } catch (err) {
                    // File doesn't exist, keep original URL
                    console.log(`  ⚠ File not found: ${filename} (keeping original URL)`);
                    updatedUrls.push(imageUrl);
                }
            } else if (imageUrl.startsWith('/assets/character/')) {
                // Already migrated
                updatedUrls.push(imageUrl);
            } else {
                // External URL or other format
                updatedUrls.push(imageUrl);
            }
        }

        // Update character in database if any images were migrated
        if (migrationCount > 0) {
            character.displayImageUrls = updatedUrls;
            await character.save();
            console.log(`✅ Updated ${character.name}: ${migrationCount} images migrated`);
        } else {
            console.log(`ℹ️  ${character.name}: No images to migrate`);
        }

        return migrationCount;
    } catch (error) {
        console.error(`❌ Error migrating ${character.name}:`, error.message);
        return 0;
    }
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('\n🚀 Starting Character Image Migration...\n');
    console.log(`Old directory: ${OLD_DIR}`);
    console.log(`New directory: ${NEW_BASE_DIR}\n`);

    try {
        // Check if old directory exists
        try {
            await fs.access(OLD_DIR);
        } catch {
            console.log('⚠️  Old directory does not exist. Nothing to migrate.');
            return;
        }

        // Get all characters
        const characters = await Character.find({
            deletedAt: null,
            displayImageUrls: { $exists: true, $ne: [] }
        });

        console.log(`📊 Found ${characters.length} characters with images\n`);

        let totalMigrated = 0;

        // Migrate each character
        for (const character of characters) {
            console.log(`\n📁 Processing: ${character.name} (${character._id})`);
            const count = await migrateCharacterImages(character);
            totalMigrated += count;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Migration Complete!`);
        console.log(`📊 Total images migrated: ${totalMigrated}`);
        console.log('='.repeat(60) + '\n');

        // Optional: List old files that weren't migrated
        const oldFiles = await fs.readdir(OLD_DIR);
        const imageFiles = oldFiles.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));

        if (imageFiles.length > 0) {
            console.log(`\nℹ️  ${imageFiles.length} files remain in old directory:`);
            console.log(`   You can manually review and delete them if needed.`);
            console.log(`   Location: ${OLD_DIR}\n`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Run migration
 */
async function run() {
    try {
        await connectDB();
        await migrate();
        console.log('\n✅ All done!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    run();
}

module.exports = { migrate };
