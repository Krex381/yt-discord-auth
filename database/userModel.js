const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true
    },
    googleTokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number
    },
    youtubeChannelId: {
        type: String,
        required: true
    },
    isSubscribed: {
        type: Boolean,
        default: false
    },
    hasLiked: {
        type: Boolean,
        default: false
    },
    hasCommented: {
        type: Boolean,
        default: false
    },
    commentId: String,
    lastChecked: {
        type: Date,
        default: Date.now
    },
    verifiedAt: Date,
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
