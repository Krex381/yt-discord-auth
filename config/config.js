require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID || '1362084999204962606',
        guildId: process.env.GUILD_ID,
        roleId: process.env.ROLE_ID,
        logchannelId: process.env.LOG_CHANNEL_ID,
    },
    google: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: process.env.REDIRECT_URI
    },
    youtube: {
        channelId: process.env.YOUTUBE_CHANNEL_ID,
        targetVideoId: process.env.TARGET_VIDEO_ID
    },
    database: {
        mongoUri: process.env.MONGODB_URI
    },
    server: {
        port: process.env.PORT || 80
    }
};
