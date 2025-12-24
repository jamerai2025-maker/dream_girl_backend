// src/models/CharacterMedia.model.js - Character Media Model for Personal/Community Galleries
const mongoose = require('mongoose');

const characterMediaSchema = new mongoose.Schema({
    // ==================== REFERENCES ====================
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: [true, 'Character ID is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // ==================== MEDIA INFORMATION ====================
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: [true, 'Media type is required']
    },
    mediaUrl: {
        type: String,
        required: [true, 'Media URL is required'],
        trim: true
    },
    thumbnailUrl: {
        type: String,
        trim: true
    },

    // ==================== VISIBILITY ====================
    visibility: {
        type: String,
        enum: ['personal', 'community'],
        default: 'personal',
        required: true
    },

    // ==================== METADATA ====================
    prompt: {
        type: String,
        maxlength: [1000, 'Prompt cannot exceed 1000 characters']
    },
    generationParams: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    width: {
        type: Number,
        min: 0
    },
    height: {
        type: Number,
        min: 0
    },
    duration: {
        type: Number, // For videos, in seconds
        min: 0
    },
    fileSize: {
        type: Number, // In bytes
        min: 0
    },

    // ==================== MODERATION ====================
    isApproved: {
        type: Boolean,
        default: true // Auto-approve personal, require approval for community
    },
    approvedAt: {
        type: Date,
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rejectedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },

    // ==================== STATISTICS ====================
    likeCount: {
        type: Number,
        default: 0,
        min: 0
    },
    viewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // ==================== SOFT DELETE ====================
    deletedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// Compound indexes for common queries
characterMediaSchema.index({ characterId: 1, visibility: 1, deletedAt: 1 });
characterMediaSchema.index({ characterId: 1, userId: 1, deletedAt: 1 });
characterMediaSchema.index({ userId: 1, visibility: 1, deletedAt: 1 });

// Sorting indexes
characterMediaSchema.index({ createdAt: -1 });
characterMediaSchema.index({ likeCount: -1 });
characterMediaSchema.index({ viewCount: -1 });

// ==================== VIRTUALS ====================

// Virtual for checking if user is owner
characterMediaSchema.virtual('isOwner').get(function () {
    return this._isOwner || false;
});

characterMediaSchema.virtual('isOwner').set(function (value) {
    this._isOwner = value;
});

// ==================== MIDDLEWARE ====================

// Validate visibility change (only character owner can set to community)
characterMediaSchema.pre('save', async function (next) {
    if (this.isModified('visibility') && this.visibility === 'community') {
        // This validation will be done in the controller
        // Here we just ensure the field is valid
    }
    next();
});

// Auto-approve personal media
characterMediaSchema.pre('save', function (next) {
    if (this.isNew && this.visibility === 'personal') {
        this.isApproved = true;
        this.approvedAt = new Date();
    }
    next();
});

// ==================== METHODS ====================

// Increment view count
characterMediaSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return await this.save();
};

// Promote to community (only character owner can do this)
characterMediaSchema.methods.promoteToCommunity = async function (approverId) {
    this.visibility = 'community';
    this.isApproved = true;
    this.approvedAt = new Date();
    this.approvedBy = approverId;
    return await this.save();
};

// Reject media
characterMediaSchema.methods.reject = async function (reason, rejectedBy) {
    this.isApproved = false;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.approvedBy = rejectedBy;
    return await this.save();
};

// Soft delete
characterMediaSchema.methods.softDelete = async function () {
    this.deletedAt = new Date();
    return await this.save();
};

// ==================== STATICS ====================

// Get community media for a character
characterMediaSchema.statics.getCommunityMedia = function (characterId, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;

    return this.find({
        characterId,
        visibility: 'community',
        isApproved: true,
        deletedAt: null
    })
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId', 'name avatar');
};

// Get personal media for a user on a character
characterMediaSchema.statics.getPersonalMedia = function (characterId, userId, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;

    return this.find({
        characterId,
        userId,
        visibility: 'personal',
        deletedAt: null
    })
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit);
};

// Get all media for a character (admin only)
characterMediaSchema.statics.getAllMedia = function (characterId, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;

    return this.find({
        characterId,
        deletedAt: null
    })
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId', 'name avatar');
};

// Count media by type
characterMediaSchema.statics.countByType = function (characterId, userId = null) {
    const query = { characterId, deletedAt: null };
    if (userId) query.userId = userId;

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: { visibility: '$visibility', mediaType: '$mediaType' },
                count: { $sum: 1 }
            }
        }
    ]);
};

const CharacterMedia = mongoose.model('CharacterMedia', characterMediaSchema);

module.exports = CharacterMedia;
