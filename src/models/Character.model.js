const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Character name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    displayId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    age: {
        type: Number,
        min: [18, 'Character must be at least 18 years old'],
        max: [150, 'Age cannot exceed 150']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Non-binary', 'Other'],
        required: [true, 'Gender is required']
    },
    description: {
        type: String,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        maxlength: [200, 'Short description cannot exceed 200 characters']
    },

    // References to separate collections
    physicalAttributesId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterPhysicalAttributes'
    },
    personalityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterPersonality'
    },
    aiGenerationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterAIGeneration'
    },
    chatConfigId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterChatConfig'
    },
    categorizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterCategorization'
    },
    statisticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterStatistics'
    },

    // Media
    displayImageUrls: {
        type: [String],
        default: [],
        validate: {
            validator: function (urls) {
                return urls.length <= 10;
            },
            message: 'Cannot have more than 10 display images'
        }
    },
    audioPack: String,

    // User Relations
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator user ID is required']
    },
    originalCreatorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Approval & Moderation
    isHomepage: {
        type: Boolean,
        default: false
    },
    approvedAt: Date,
    firstApprovedAt: Date,
    deletedAt: Date,

    // Extra
    extraDetails: {
        type: String,
        maxlength: [500, 'Extra details cannot exceed 500 characters']
    },
    embedding: [Number]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== INDEXES ====================

characterSchema.index({ createdByUserId: 1 });
characterSchema.index({ createdAt: -1 });
characterSchema.index({ deletedAt: 1 });
characterSchema.index({
    name: 'text',
    description: 'text',
    shortDescription: 'text'
});

// ==================== VIRTUALS ====================

characterSchema.virtual('url').get(function () {
    return `/characters/${this.displayId || this._id}`;
});

characterSchema.virtual('isOwner').get(function () {
    return this._isOwner || false;
});

characterSchema.virtual('isOwner').set(function (value) {
    this._isOwner = value;
});

// ==================== MIDDLEWARE ====================

characterSchema.pre('save', async function (next) {
    if (!this.displayId && this.isNew) {
        const baseId = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        let displayId = baseId;
        let counter = 0;

        while (await this.constructor.findOne({ displayId })) {
            counter++;
            displayId = `${baseId}-${counter}`;
        }

        this.displayId = displayId;
    }
    next();
});

// ==================== METHODS ====================

characterSchema.methods.toPublicProfile = function () {
    return {
        id: this._id,
        displayId: this.displayId,
        name: this.name,
        age: this.age,
        gender: this.gender,
        shortDescription: this.shortDescription,
        displayImageUrls: this.displayImageUrls,
        createdAt: this.createdAt
    };
};

// ==================== STATICS ====================

characterSchema.statics.findByIdOrDisplayId = function (identifier) {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        return this.findOne({
            $or: [
                { _id: identifier },
                { displayId: identifier }
            ],
            deletedAt: null
        });
    }
    return this.findOne({ displayId: identifier, deletedAt: null });
};

const Character = mongoose.model('Character', characterSchema);

module.exports = Character;
