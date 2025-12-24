const mongoose = require('mongoose');

const characterFetishSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Fetish name is required'],
        trim: true,
        maxlength: [100, 'Fetish name cannot exceed 100 characters']
    },
    emoji: {
        type: String,
        required: [true, 'Emoji is required'],
        trim: true
    },
    isCustom: {
        type: Boolean,
        default: false
    },
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Index for faster lookups
characterFetishSchema.index({ name: 1 });
characterFetishSchema.index({ isCustom: 1 });

const CharacterFetish = mongoose.model('CharacterFetish', characterFetishSchema);

module.exports = CharacterFetish;
