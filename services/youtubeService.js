const { google } = require('googleapis');
const config = require('../config/config');

class YouTubeService {
    constructor() {

    }

    async getUserChannelInfo(accessToken, refreshToken) {
        try {
            console.log('🔄 Getting YouTube channel information...');
            
            const oauth2Client = new google.auth.OAuth2(
                config.google.clientId,
                config.google.clientSecret,
                config.google.redirectUri
            );
            
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            const youtube = google.youtube({ 
                version: 'v3', 
                auth: oauth2Client 
            });
            
            const response = await youtube.channels.list({
                part: ['snippet'],
                mine: true
            });

            console.log('📋 Channel API response:', {
                itemCount: response.data.items ? response.data.items.length : 0,
                pageInfo: response.data.pageInfo
            });

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                console.log('✅ Channel found:', {
                    id: channel.id,
                    title: channel.snippet.title
                });
                
                return {
                    id: channel.id,
                    title: channel.snippet.title
                };
            }

            console.log('❌ No channel found');
            return null;
        } catch (error) {
            console.error('❌ Channel info error:', error.message);
            
            
            if (error.code === 401 || error.code === 403) {
                console.log('🔄 Trying with API key...');
                return await this.getUserChannelInfoWithApiKey(accessToken, refreshToken);
            }
            
            throw error;
        }
    }

    
    async getUserChannelInfoWithApiKey(accessToken, refreshToken) {
        try {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            
            console.log('👤 User info:', userInfo.data);
            
            
            const youtube = google.youtube({ 
                version: 'v3', 
                auth: process.env.YOUTUBE_API_KEY 
            });
            
            
            const response = await youtube.channels.list({
                part: ['snippet'],
                forUsername: userInfo.data.email.split('@')[0] 
            });
            
            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                return {
                    id: channel.id,
                    title: channel.snippet.title
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ API key channel fetch error:', error.message);
            throw error;
        }
    }

    
    async checkSubscription(accessToken, refreshToken) {
        try {
            console.log('🔄 Subscription check starting...');
            
            
            if (!accessToken || !refreshToken) {
                console.error('❌ Missing tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
                throw new Error('Missing access token or refresh token');
            }
            
            const oauth2Client = new google.auth.OAuth2(
                config.google.clientId,
                config.google.clientSecret,
                config.google.redirectUri
            );
            
            
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            const youtube = google.youtube({ 
                version: 'v3', 
                auth: oauth2Client 
            });

            const response = await youtube.subscriptions.list({
                part: ['snippet'],
                mine: true,
                forChannelId: config.youtube.channelId,
                maxResults: 1
            });

            console.log('📋 Subscription API response:', {
                itemCount: response.data.items ? response.data.items.length : 0,
                targetChannel: config.youtube.channelId
            });

            const isSubscribed = response.data.items && response.data.items.length > 0;
            console.log(isSubscribed ? '✅ Subscription found' : '❌ Not subscribed');
            
            return isSubscribed;
        } catch (error) {
            console.error('❌ Subscription check error:', error.message);
            if (error.code === 403) {
                console.log('⚠️ User may have hidden their subscriptions');
                return false;
            }
            throw error;
        }
    }

    
    async checkUserComment(accessToken, refreshToken, videoId, userChannelId) {
        try {
            console.log('🔄 Comment check starting...', { videoId, userChannelId });
            
            const oauth2Client = new google.auth.OAuth2(
                config.google.clientId,
                config.google.clientSecret,
                config.google.redirectUri
            );
            
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            const youtube = google.youtube({ 
                version: 'v3', 
                auth: oauth2Client 
            });

            
            const response = await youtube.commentThreads.list({
                part: ['snippet'],
                videoId: videoId,
                maxResults: 100,
                order: 'time'
            });

            if (!response.data.items) {
                console.log('❌ No video comments found');
                return { found: false, commentId: null };
            }

            console.log(`📋 ${response.data.items.length} comments found, checking...`);

            
            for (const item of response.data.items) {
                const comment = item.snippet.topLevelComment.snippet;
                
                console.log('🔍 Checking comment:', {
                    authorChannelId: comment.authorChannelId?.value,
                    authorDisplayName: comment.authorDisplayName,
                    textDisplay: comment.textDisplay?.substring(0, 50) + '...'
                });
                
                
                if (comment.authorChannelId && comment.authorChannelId.value === userChannelId) {
                    console.log('✅ User comment found!');
                    return {
                        found: true,
                        commentId: item.id,
                        commentText: comment.textDisplay,
                        publishedAt: comment.publishedAt
                    };
                }
            }

            
            if (response.data.nextPageToken) {
                console.log('🔄 Continuing with pagination...');
                return await this.checkUserCommentWithPagination(accessToken, refreshToken, videoId, userChannelId, response.data.nextPageToken);
            }

            console.log('❌ User comment not found');
            return { found: false, commentId: null };
        } catch (error) {
            console.error('❌ Comment check error:', error.message);
            throw error;
        }
    }

    
    async checkUserCommentWithPagination(accessToken, refreshToken, videoId, userChannelId, pageToken, maxPages = 5) {
        let currentPage = 0;
        let nextPageToken = pageToken;

        const oauth2Client = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUri
        );
        
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });
        
        const youtube = google.youtube({ 
            version: 'v3', 
            auth: oauth2Client 
        });

        while (nextPageToken && currentPage < maxPages) {
            try {
                console.log(`🔄 Checking page ${currentPage + 1}...`);
                
                const response = await youtube.commentThreads.list({
                    part: ['snippet'],
                    videoId: videoId,
                    maxResults: 100,
                    pageToken: nextPageToken,
                    order: 'time'
                });

                if (response.data.items) {
                    for (const item of response.data.items) {
                        const comment = item.snippet.topLevelComment.snippet;
                        
                        if (comment.authorChannelId && comment.authorChannelId.value === userChannelId) {
                            console.log(`✅ User comment found on page ${currentPage + 1}!`);
                            return {
                                found: true,
                                commentId: item.id,
                                commentText: comment.textDisplay,
                                publishedAt: comment.publishedAt
                            };
                        }
                    }
                }

                nextPageToken = response.data.nextPageToken;
                currentPage++;
            } catch (error) {
                console.error(`❌ Page ${currentPage + 1} check error:`, error.message);
                break;
            }
        }

        console.log(`❌ ${currentPage} pages checked, comment not found`);
        return { found: false, commentId: null };
    }

    
    async refreshUserTokens(user) {
        try {
            const oauth2Client = new google.auth.OAuth2(
                config.google.clientId,
                config.google.clientSecret,
                config.google.redirectUri
            );
            
            oauth2Client.setCredentials({
                refresh_token: user.googleTokens.refresh_token
            });
            
            const { credentials } = await oauth2Client.refreshAccessToken();
            
            
            user.googleTokens = { ...user.googleTokens, ...credentials };
            await user.save();
            
            console.log('✅ Token successfully refreshed');
            return credentials;
        } catch (error) {
            console.error('❌ Token refresh error:', error.message);
            throw error;
        }
    }

    
    async checkVideoLike(accessToken, refreshToken, videoId) {
        try {
            console.log('🔄 Like check starting...', { videoId });
            
            
            if (!accessToken || !refreshToken) {
                console.error('❌ Missing tokens for like check:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
                throw new Error('Missing access token or refresh token');
            }
            
            const oauth2Client = new google.auth.OAuth2(
                config.google.clientId,
                config.google.clientSecret,
                config.google.redirectUri
            );
            
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            const youtube = google.youtube({ 
                version: 'v3', 
                auth: oauth2Client 
            });

            
            const response = await youtube.videos.getRating({
                id: videoId
            });

            console.log('📋 Like API response:', {
                videoId: videoId,
                items: response.data.items ? response.data.items.length : 0
            });

            if (response.data.items && response.data.items.length > 0) {
                const rating = response.data.items[0].rating;
                const hasLiked = rating === 'like';
                
                console.log(hasLiked ? '✅ Video liked' : `❌ Video not liked (rating: ${rating})`);
                return hasLiked;
            }

            console.log('❌ No rating data found');
            return false;
        } catch (error) {
            console.error('❌ Like check error:', error.message);
            if (error.code === 403) {
                console.log('⚠️ User may have hidden their activity or insufficient permissions');
                return false;
            }
            throw error;
        }
    }
}

module.exports = new YouTubeService();
