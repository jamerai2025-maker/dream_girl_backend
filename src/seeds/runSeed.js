#!/usr/bin/env node

/**
 * Seed Runner Script
 * Run this script to populate the database with predefined character attributes
 * Usage: node src/seeds/runSeed.js
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const seedCharacterAttributes = require('./characterAttributes.seed');
const seedCharacterPoses = require('./characterPoses.seed');

const runSeeds = async () => {
    try {
        // Connect to MongoDB
        logger.info('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('✅ Connected to MongoDB');

        // Run all seeds
        logger.info('🌱 Starting seed process...');

        await seedCharacterAttributes();
        await seedCharacterPoses();

        logger.info('🎉 All seeds completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Seed process failed:', error);
        process.exit(1);
    }
};

runSeeds();
