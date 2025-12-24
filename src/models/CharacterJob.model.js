const mongoose = require('mongoose');

/**
 * Character Job Schema
 * Tracks the status of character creation jobs
 */

const characterJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'waiting', 'active', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    characterData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    result: {
        characterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Character'
        },
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

// Indexes for efficient queries
characterJobSchema.index({ userId: 1, createdAt: -1 });
characterJobSchema.index({ status: 1, createdAt: -1 });
characterJobSchema.index({ createdAt: -1 });

// Auto-delete old completed jobs after 7 days
characterJobSchema.index({ completedAt: 1 }, {
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { status: 'completed' }
});

const CharacterJob = mongoose.model('CharacterJob', characterJobSchema);

module.exports = CharacterJob;
