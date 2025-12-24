const mongoose = require('mongoose');

const characterChatConfigSchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    initialMessages: {
        type: [[{
            type: { type: String, enum: ['text', 'image'] },
            content: String
        }]],
        default: []
    },
    exampleResponses: {
        type: [String],
        default: []
    },
    scenario: {
        type: String,
        maxlength: [1000, 'Scenario cannot exceed 1000 characters']
    },
    firstReplySuggestion: {
        type: String,
        maxlength: [200, 'First reply suggestion cannot exceed 200 characters']
    }
}, {
    timestamps: true
});

const CharacterChatConfig = mongoose.model('CharacterChatConfig', characterChatConfigSchema);

module.exports = CharacterChatConfig;
