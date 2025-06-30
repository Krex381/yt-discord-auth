const cron = require('node-cron');
const User = require('../database/userModel');
const youtubeService = require('../services/youtubeService');
const discordService = require('../services/discordService');
const tokenManager = require('../services/tokenManager');
const config = require('../config/config');
const { EmbedBuilder } = require('discord.js');

class UserChecker {
    constructor() {
        this.isRunning = false;
    }

    startScheduler() {
        cron.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                console.log('⏳ Previous check still running, skipping...');
                return;
            }

            console.log('🔍 Starting user verification check...');
            await this.checkAllUsers();
        });

        cron.schedule('0 2 * * *', async () => {
            console.log('🧹 Starting token cleanup...');
            await tokenManager.cleanupInvalidTokens();
        });

        console.log('⏰ Cron job started (every 5 minutes)');
    }

    async checkAllUsers() {
        this.isRunning = true;
        let checkedCount = 0;
        let errorCount = 0;
        let revokedCount = 0;

        try {
            const users = await User.find({ 
                isVerified: true,
                'googleTokens.refresh_token': { $exists: true }
            });

            console.log(`📋 ${users.length} verified users will be checked`);

            for (const user of users) {
                try {
                    const result = await this.checkSingleUser(user);
                    checkedCount++;

                    if (!result.isValid) {
                        revokedCount++;
                        console.log(`🚫 ${user.discordId} user verification revoked`);
                    }

                    await this.sleep(1000);

                } catch (error) {
                    errorCount++;
                    console.error(`❌ User check error (${user.discordId}):`, error.message);
                }
            }

            console.log(`✅ Check completed: ${checkedCount} checked, ${revokedCount} revoked, ${errorCount} errors`);

        } catch (error) {
            console.error('❌ Bulk user check error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async checkSingleUser(user) {
        try {
            let tokens = user.googleTokens;
            
            if (tokenManager.needsRefresh(tokens)) {
                try {
                    const newTokens = await youtubeService.refreshUserTokens(user);
                    tokens = newTokens;
                } catch (tokenError) {
                    await this.revokeUserAccess(user, 'token_invalid');
                    return { isValid: false, reason: 'token_invalid' };
                }
            }

            const isSubscribed = await youtubeService.checkSubscription(tokens.access_token, tokens.refresh_token);
            
            if (!isSubscribed) {
                await this.revokeUserAccess(user, 'not_subscribed');
                return { isValid: false, reason: 'not_subscribed' };
            }

            const hasLiked = await youtubeService.checkVideoLike(
                tokens.access_token,
                tokens.refresh_token,
                config.youtube.targetVideoId
            );
            
            if (!hasLiked) {
                await this.revokeUserAccess(user, 'not_liked');
                return { isValid: false, reason: 'not_liked' };
            }

            if (user.commentId) {
                const commentResult = await youtubeService.checkUserComment(
                    tokens.access_token,
                    tokens.refresh_token,
                    config.youtube.targetVideoId,
                    user.youtubeChannelId
                );

                if (!commentResult.found) {
                    await this.revokeUserAccess(user, 'comment_deleted');
                    return { isValid: false, reason: 'comment_deleted' };
                }
            }

            user.lastChecked = new Date();
            await user.save();

            return { isValid: true };

        } catch (error) {
            console.error(`User check error (${user.discordId}):`, error);
            throw error;
        }
    }

    async revokeUserAccess(user, reason) {
        try {
            await discordService.removeRole(user.discordId);

            const embed = this.getRevocationEmbed(reason);
            await discordService.sendDM(user.discordId, { embeds: [embed] });

            user.isVerified = false;
            user.isSubscribed = false;
            user.hasLiked = false;
            user.hasCommented = false;
            user.lastChecked = new Date();
            await user.save();

            console.log(`🚫 ${user.discordId} - Access revoked: ${reason}`);

        } catch (error) {
            console.error(`Access revocation error (${user.discordId}):`, error);
        }
    }

    getRevocationEmbed(reason) {
        const embedData = {
            'not_subscribed': {
                title: '📺 Subscription Verification Failed',
                description: 'Your YouTube subscription has been canceled or is no longer visible.',
                fields: [
                    {
                        name: '🔍 What was detected:',
                        value: 'You are no longer subscribed to our YouTube channel',
                        inline: false
                    },
                    {
                        name: '⚡ Action taken:',
                        value: 'Your Discord role has been removed',
                        inline: false
                    },
                    {
                        name: '🔄 How to regain access:',
                        value: '1. Subscribe to our YouTube channel\n2. Use `/verify` command in Discord\n3. Complete the verification process',
                        inline: false
                    }
                ],
                color: 0xff4444,
                thumbnail: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
            },
            'comment_deleted': {
                title: '💬 Comment Verification Failed',
                description: 'Your comment on the required video has been deleted or is no longer visible.',
                fields: [
                    {
                        name: '🔍 What was detected:',
                        value: 'Your comment on the designated video was removed',
                        inline: false
                    },
                    {
                        name: '⚡ Action taken:',
                        value: 'Your Discord role has been removed',
                        inline: false
                    },
                    {
                        name: '🔄 How to regain access:',
                        value: '1. Comment on the required video\n2. Use `/verify-comment` command in Discord\n3. Complete the verification process',
                        inline: false
                    }
                ],
                color: 0xff6b35,
                thumbnail: 'https://cdn-icons-png.flaticon.com/512/1827/1827365.png'
            },
            'token_invalid': {
                title: '🔐 Authorization Expired',
                description: 'Your Google authorization has expired or been revoked.',
                fields: [
                    {
                        name: '🔍 What was detected:',
                        value: 'Your Google account access permissions are no longer valid',
                        inline: false
                    },
                    {
                        name: '⚡ Action taken:',
                        value: 'Your Discord role has been removed',
                        inline: false
                    },
                    {
                        name: '🔄 How to regain access:',
                        value: '1. Use `/verify` command in Discord\n2. Re-authorize your Google account\n3. Complete the verification process',
                        inline: false
                    }
                ],
                color: 0x8b4513,
                thumbnail: 'https://cdn-icons-png.flaticon.com/512/1161/1161388.png'
            },
            'not_liked': {
                title: '👍 Like Verification Failed',
                description: 'Your like on the required video has been removed or is no longer visible.',
                fields: [
                    {
                        name: '🔍 What was detected:',
                        value: 'You have unliked the designated video',
                        inline: false
                    },
                    {
                        name: '⚡ Action taken:',
                        value: 'Your Discord role has been removed',
                        inline: false
                    },
                    {
                        name: '🔄 How to regain access:',
                        value: '1. Like the required video again\n2. Use `/verify` command in Discord\n3. Complete the verification process',
                        inline: false
                    }
                ],
                color: 0xff9500,
                thumbnail: 'https://cdn-icons-png.flaticon.com/512/889/889140.png'
            }
        };

        const data = embedData[reason] || {
            title: '⚠️ Verification Status Changed',
            description: 'Your verification status has been updated.',
            fields: [
                {
                    name: '⚡ Action taken:',
                    value: 'Your Discord role has been removed',
                    inline: false
                },
                {
                    name: '🔄 How to regain access:',
                    value: 'Please complete the verification process again using `/verify` command',
                    inline: false
                }
            ],
            color: 0x666666,
            thumbnail: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
        };

        return new EmbedBuilder()
            .setTitle(data.title)
            .setDescription(data.description)
            .addFields(data.fields)
            .setColor(data.color)
            .setThumbnail(data.thumbnail)
            .setFooter({ 
                text: 'YouTube Discord Verifier | Automated Check',
                iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384012.png'
            })
            .setTimestamp();
    }

    async manualCheck(discordId) {
        try {
            const user = await User.findOne({ discordId });
            
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const result = await this.checkSingleUser(user);
            
            return {
                success: true,
                isValid: result.isValid,
                reason: result.reason,
                message: result.isValid ? 'Verification valid' : `Verification invalid: ${result.reason}`
            };

        } catch (error) {
            return {
                success: false,
                message: 'Check error: ' + error.message
            };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new UserChecker();
