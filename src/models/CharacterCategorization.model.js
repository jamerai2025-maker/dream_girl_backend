const mongoose = require('mongoose');

const characterCategorizationSchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (tags) {
                return tags.length <= 20;
            },
            message: 'Cannot have more than 20 tags'
        }
    },
    mainCategory: {
        type: String,
        enum: ['Female', 'Male', 'Non-binary', 'Fantasy', 'Anime', 'Other'],
        default: 'Female'
    },
    visibility: {
        type: String,
        enum: ['Public', 'Private', 'Unlisted'],
        default: 'Public'
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
characterCategorizationSchema.index({ visibility: 1, hidden: 1 });
characterCategorizationSchema.index({ mainCategory: 1, visibility: 1 });
characterCategorizationSchema.index({ tags: 1 });

const CharacterCategorization = mongoose.model('CharacterCategorization', characterCategorizationSchema);

module.exports = CharacterCategorization;
