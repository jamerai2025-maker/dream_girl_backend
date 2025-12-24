const mongoose = require('mongoose');

const characterAIGenerationSchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    characterImagePrompt: {
        type: String,
        maxlength: [1000, 'Image prompt cannot exceed 1000 characters']
    },
    faceTunerPrompt: {
        type: String,
        maxlength: [500, 'Face tuner prompt cannot exceed 500 characters']
    },
    faceTunerCfg: {
        type: Number,
        min: 0,
        max: 100
    },
    rawFacePrompt: {
        type: String,
        maxlength: [500, 'Raw face prompt cannot exceed 500 characters']
    },
    displayImageFeatures: {
        type: String,
        maxlength: [500, 'Display image features cannot exceed 500 characters']
    },
    customFeatures: {
        type: String,
        maxlength: [500, 'Custom features cannot exceed 500 characters']
    },
    createdWithAI: {
        type: Boolean,
        default: false
    },
    model: {
        type: String,
        default: 'BabesYogi'
    }
}, {
    timestamps: true
});

const CharacterAIGeneration = mongoose.model('CharacterAIGeneration', characterAIGenerationSchema);

module.exports = CharacterAIGeneration;
