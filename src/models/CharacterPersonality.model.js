const mongoose = require('mongoose');

const characterPersonalitySchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    personality: {
        type: String,
        maxlength: [1000, 'Personality description cannot exceed 1000 characters']
    },
    personalityDetails: {
        type: String,
        maxlength: [500, 'Personality details cannot exceed 500 characters']
    },
    voice: {
        type: String,
        maxlength: [100, 'Voice description cannot exceed 100 characters']
    },
    occupationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterOccupation',
        default: null
    },
    relationshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterRelationship',
        default: null
    },
    hobbyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterHobby',
        default: null
    },
    fetishId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterFetish',
        default: null
    },
    poseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CharacterPose',
        default: null
    }
}, {
    timestamps: true
});

const CharacterPersonality = mongoose.model('CharacterPersonality', characterPersonalitySchema);

module.exports = CharacterPersonality;
