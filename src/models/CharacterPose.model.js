const mongoose = require('mongoose');

const characterPoseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Pose name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Pose name cannot exceed 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Community', 'Body Focus', 'Masturbation', 'Oral', 'Intercourse', 'Group', 'BDSM', 'Aftermath', 'Miscellaneous']
    },
    prompt: {
        type: String,
        required: [true, 'Prompt is required'],
        maxlength: [2000, 'Prompt cannot exceed 2000 characters']
    },
    emoji: {
        type: String,
        default: '🎭'
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

// Indexes
characterPoseSchema.index({ category: 1 });
characterPoseSchema.index({ isCustom: 1 });

module.exports = mongoose.model('CharacterPose', characterPoseSchema);
