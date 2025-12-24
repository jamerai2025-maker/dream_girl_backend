const mongoose = require('mongoose');

const characterStatisticsSchema = new mongoose.Schema({
    characterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true,
        unique: true
    },
    messageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    likeCount: {
        type: Number,
        default: 0,
        min: 0
    },
    viewCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes for sorting
characterStatisticsSchema.index({ messageCount: -1 });
characterStatisticsSchema.index({ likeCount: -1 });
characterStatisticsSchema.index({ viewCount: -1 });

// Methods
characterStatisticsSchema.methods.incrementMessageCount = async function () {
    this.messageCount += 1;
    return await this.save();
};

characterStatisticsSchema.methods.incrementLikeCount = async function () {
    this.likeCount += 1;
    return await this.save();
};

characterStatisticsSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return await this.save();
};

const CharacterStatistics = mongoose.model('CharacterStatistics', characterStatisticsSchema);

module.exports = CharacterStatistics;
