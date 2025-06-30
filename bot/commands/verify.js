const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const oauthClient = require('../../oauth/oauthClient');
const User = require('../../database/userModel');
const youtubeService = require('../../services/youtubeService');
const discordService = require('../../services/discordService');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your YouTube channel subscription'),

    async execute(interaction) {
        try {
            const existingUser = await User.findOne({ discordId: interaction.user.id });

            if (existingUser && existingUser.googleTokens) {
                try {
                    console.log('🔍 Debug tokens:', {
                        hasAccessToken: !!existingUser.googleTokens.access_token,
                        hasRefreshToken: !!existingUser.googleTokens.refresh_token,
                        accessTokenLength: existingUser.googleTokens.access_token ? existingUser.googleTokens.access_token.length : 0
                    });
                    
                    const isSubscribed = await youtubeService.checkSubscription(
                        existingUser.googleTokens.access_token,
                        existingUser.googleTokens.refresh_token
                    );

                    const hasLiked = await youtubeService.checkVideoLike(
                        existingUser.googleTokens.access_token,
                        existingUser.googleTokens.refresh_token,
                        config.youtube.targetVideoId
                    );

                    existingUser.isSubscribed = isSubscribed;
                    existingUser.hasLiked = hasLiked;
                    existingUser.lastChecked = new Date();
                    
                    const wasVerified = existingUser.isVerified;
                    existingUser.isVerified = isSubscribed && hasLiked && existingUser.hasCommented;
                    
                    await existingUser.save();

                    if (existingUser.isVerified && !wasVerified) {
                        await discordService.giveRole(interaction.user.id);
                    } else if (!existingUser.isVerified && wasVerified) {
                        await discordService.removeRole(interaction.user.id);
                    }

                    const embed = new EmbedBuilder()
                        .setColor(existingUser.isVerified ? 0x00ff00 : (isSubscribed && hasLiked) ? 0x00aa00 : isSubscribed ? 0xffaa00 : 0xff6b00)
                        .setTitle('� YouTube Verification Status')
                        .setDescription('Here\'s your current verification status:')
                        .addFields([
                            {
                                name: '📺 **Subscription Status**',
                                value: isSubscribed ? '✅ **Subscribed** - You are subscribed to our channel!' : '❌ **Not Subscribed** - Please subscribe to our YouTube channel',
                                inline: false
                            },
                            {
                                name: '� **Like Status**',
                                value: hasLiked ? '✅ **Liked** - You have liked the target video!' : '❌ **Not Liked** - Please like the target video',
                                inline: false
                            },
                            {
                                name: '�💬 **Comment Status**',
                                value: existingUser.hasCommented ? '✅ **Verified** - Your comment has been verified!' : '❌ **Not Verified** - Use `/verify-comment` after commenting',
                                inline: false
                            },
                            {
                                name: '🎭 **Role Status**',
                                value: existingUser.isVerified ? '✅ **Role Assigned** - You have the verified role!' : '⏳ **Pending** - Complete all verifications to get your role',
                                inline: false
                            }
                        ])
                        .setFooter({ 
                            text: `Last checked: ${new Date().toLocaleString()}` 
                        })
                        .setImage("https://images-ext-2.discordapp.net/external/NSE8BGpgc7RyRxtIPbFEJ4jNzm2TxQ6fVwV4xB-9eis/https/cdn-longterm.mee6.xyz/plugins/embeds/images/1101575916305526934/30b8e58e94fd8cc16432ff41fda7fc3741be24dc188c43a4ba4eb7a20cf51e2e.gif")
                        .setTimestamp();

                    if (!isSubscribed || !hasLiked) {
                        const steps = [];
                        if (!isSubscribed) {
                            steps.push(`🔗 [Subscribe to our channel](https://youtube.com/channel/${config.youtube.channelId})`);
                        }
                        if (!hasLiked) {
                            steps.push(`� [Like this video](https://youtube.com/watch?v=${config.youtube.targetVideoId})`);
                        }
                        steps.push('⏳ Then use `/verify` again to refresh your status');
                        
                        embed.addFields([
                            {
                                name: '📝 **Next Steps**',
                                value: steps.join('\n'),
                                inline: false
                            }
                        ]);
                    } else if (!existingUser.hasCommented) {
                        embed.addFields([
                            {
                                name: '📝 **Next Steps**',
                                value: `🎥 [Comment on this video](https://youtube.com/watch?v=${config.youtube.targetVideoId})\n💬 Then use \`/verify-comment\` to verify your comment`,
                                inline: false
                            }
                        ]);
                    }

                    await interaction.reply({ 
                        embeds: [embed],
                        flags: 64
                    });

                } catch (error) {
                    console.error('Subscription check error:', error);
                    
                    const authUrl = oauthClient.generateAuthUrl(interaction.user.id);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xffaa00)
                        .setTitle('🔄 Re-authentication Required')
                        .setDescription('Your authentication has expired. Please reconnect your YouTube account.')
                        .addFields([
                            {
                                name: '🔗 Verification Link:',
                                value: `[Click here to re-authenticate](${authUrl})`
                            }
                        ])
                        .setFooter({ 
                            text: 'Link is valid for 10 minutes' 
                        })
                        .setTimestamp();

                    await interaction.reply({ 
                        embeds: [errorEmbed],
                        flags: 64
                    });
                }
            } else {
                const authUrl = oauthClient.generateAuthUrl(interaction.user.id);

                const embed = new EmbedBuilder()
                    .setColor(0x9b00ff)
                    .setTitle('🔗 YouTube Authentication Required')
                    .setDescription('Connect your YouTube account to verify your subscription status.')
                    .addFields([
                        {
                            name: '📝 **First Time Setup**',
                            value: '1. Click the link below\n2. Login with your Google account\n3. Accept permissions\n4. Your subscription will be automatically verified'
                        },
                        {
                            name: '🔗 **Authentication Link**',
                            value: `[Click here to connect YouTube](${authUrl})`
                        },
                        {
                            name: '💡 **What happens next?**',
                            value: 'After connecting, your subscription status will be checked automatically. If you\'re subscribed, you can then use `/verify-comment` for comment verification.'
                        }
                    ])
                    .setFooter({ 
                        text: 'One-time authentication • Link valid for 10 minutes' 
                    })
                    .setImage("https://images-ext-2.discordapp.net/external/NSE8BGpgc7RyRxtIPbFEJ4jNzm2TxQ6fVwV4xB-9eis/https/cdn-longterm.mee6.xyz/plugins/embeds/images/1101575916305526934/30b8e58e94fd8cc16432ff41fda7fc3741be24dc188c43a4ba4eb7a20cf51e2e.gif")
                    .setTimestamp();

                await interaction.reply({ 
                    embeds: [embed],
                    flags: 64
                });
            }

        } catch (error) {
            console.error('Verify command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription('An error occurred during verification. Please try again later.')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [errorEmbed], 
                flags: 64
            });
        }
    }
};
