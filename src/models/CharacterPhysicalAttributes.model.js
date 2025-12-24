const mongoose = require('mongoose');

const characterPhysicalAttributesSchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    style: {
        type: String,
        enum: ['Realistic', 'Anime', 'Cartoon', '3D', 'Fantasy', 'Other'],
        default: 'Realistic'
    },
    ethnicity: {
        type: String,
        trim: true
    },
    skinColor: {
        type: String,
        trim: true
    },
    eyeColor: {
        type: String,
        trim: true
    },
    hairColor: {
        type: String,
        trim: true
    },
    hairStyle: {
        type: String,
        trim: true
    },
    bodyType: {
        type: String,
        enum: ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Other']
    },
    breastSize: {
        type: String,
        enum: ['Small', 'Medium', 'Large', 'Extra-large']
    },
    buttSize: {
        type: String,
        enum: ['Small', 'Medium', 'Large', 'Extra-large']
    }
}, {
    timestamps: true
});

const CharacterPhysicalAttributes = mongoose.model('CharacterPhysicalAttributes', characterPhysicalAttributesSchema);

module.exports = CharacterPhysicalAttributes;
