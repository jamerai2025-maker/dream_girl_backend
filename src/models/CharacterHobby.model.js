const mongoose = require('mongoose');

const characterHobbySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hobby name is required'],
        trim: true,
        maxlength: [100, 'Hobby name cannot exceed 100 characters']
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
characterHobbySchema.index({ name: 1 });
characterHobbySchema.index({ isCustom: 1 });

const CharacterHobby = mongoose.model('CharacterHobby', characterHobbySchema);

module.exports = CharacterHobby;
