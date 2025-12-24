const mongoose = require('mongoose');

/**
 * Media Generation Job Schema
 * Tracks the status of image and video generation jobs
 */

const mediaGenerationJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'waiting', 'active', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    inputData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    result: {
        mediaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CharacterMedia'
        },
        url: String,
        error: String
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    attemptsMade: {
        type: Number,
        default: 0
    },
    failedReason: String,
    completedAt: Date,
    startedAt: Date
}, {
    timestamps: true
});

// Indexes
mediaGenerationJobSchema.index({ userId: 1, type: 1, createdAt: -1 });
mediaGenerationJobSchema.index({ characterId: 1, type: 1, createdAt: -1 });
mediaGenerationJobSchema.index({ status: 1, type: 1, createdAt: -1 });

// Auto-delete old completed jobs after 7 days
mediaGenerationJobSchema.index({ completedAt: 1 }, {
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { status: 'completed' }
});

const MediaGenerationJob = mongoose.model('MediaGenerationJob', mediaGenerationJobSchema);

module.exports = MediaGenerationJob;
