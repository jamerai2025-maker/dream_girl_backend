const mongoose = require('mongoose');

const characterOccupationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Occupation name is required'],
        trim: true,
        maxlength: [100, 'Occupation name cannot exceed 100 characters']
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
characterOccupationSchema.index({ name: 1 });
characterOccupationSchema.index({ isCustom: 1 });

const CharacterOccupation = mongoose.model('CharacterOccupation', characterOccupationSchema);

module.exports = CharacterOccupation;
