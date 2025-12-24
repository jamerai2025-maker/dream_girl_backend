const mongoose = require('mongoose');

const characterRelationshipSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Relationship name is required'],
        trim: true,
        maxlength: [100, 'Relationship name cannot exceed 100 characters']
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
characterRelationshipSchema.index({ name: 1 });
characterRelationshipSchema.index({ isCustom: 1 });

const CharacterRelationship = mongoose.model('CharacterRelationship', characterRelationshipSchema);

module.exports = CharacterRelationship;
