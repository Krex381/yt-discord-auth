const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/userModel');
const youtubeService = require('../../services/youtubeService');
const discordService = require('../../services/discordService');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify-comment')
        .setDescription('Verify your comment on the designated video')
        .addStringOption(option =>
            option.setName('video_id')
                .setDescription('YouTube video ID (e.g: dQw4w9WgXcQ)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const user = await User.findOne({ discordId: interaction.user.id });
            
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ User Not Found')
                    .setDescription('Please first connect your YouTube account using `/verify` command.')
                    .addFields([
                        {
                            name: '📝 **Next Steps**',
                            value: '🔗 Use `/verify` to connect your YouTube account\n⏳ Then come back to verify your comment',
                            inline: false
                        }
                    ])
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            if (!user.isSubscribed || !user.hasLiked) {
                const missing = [];
                if (!user.isSubscribed) missing.push('subscription');
                if (!user.hasLiked) missing.push('like');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Prerequisites Required')
                    .setDescription(`You need to complete the following before verifying your comment: ${missing.join(' and ')}.`)
                    .addFields([
                        {
                            name: '📝 **Next Steps**',
                            value: `${!user.isSubscribed ? `🔗 [Subscribe to our channel](https://youtube.com/channel/${config.youtube.channelId})\n` : ''}${!user.hasLiked ? `👍 [Like this video](https://youtube.com/watch?v=${config.youtube.targetVideoId})\n` : ''}⏳ Use \`/verify\` to refresh your status`,
                            inline: false
                        }
                    ])
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            const videoId = interaction.options.getString('video_id') || config.youtube.targetVideoId;
            
            if (!videoId) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Video ID Required')
                    .setDescription('Please specify a video ID or contact administrator.')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            if (user.hasCommented && user.isVerified) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Already Verified')
                    .setDescription('Your comment has already been verified!')
                    .addFields([
                        {
                            name: '📊 **Current Status**',
                            value: '✅ **Subscribed** to YouTube channel\n✅ **Liked** the target video\n✅ **Comment verified** on video\n✅ **Discord role** assigned',
                            inline: false
                        },
                        {
                            name: '🎉 **All Set!**',
                            value: 'You have completed all verification steps and have access to special perks!',
                            inline: false
                        }
                    ])
                    .setFooter({ text: `Verified on: ${user.verifiedAt ? user.verifiedAt.toLocaleString() : 'Unknown'}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            let tokens = user.googleTokens;
            try {
                if (!tokens.access_token || Date.now() >= (tokens.expiry_date || 0)) {
                    tokens = await youtubeService.refreshUserTokens(user);
                }
            } catch (tokenError) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Authentication Error')
                    .setDescription('Your Google authentication has expired. Please re-authenticate.')
                    .addFields([
                        {
                            name: '📝 **Next Steps**',
                            value: '🔗 Use `/verify` command to re-authenticate\n⏳ Then come back to verify your comment',
                            inline: false
                        }
                    ])
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            const commentResult = await youtubeService.checkUserComment(
                tokens.access_token,
                tokens.refresh_token,
                videoId, 
                user.youtubeChannelId
            );

            if (commentResult.found) {
                const wasVerified = user.isVerified;
                user.hasCommented = true;
                user.commentId = commentResult.commentId;
                user.isVerified = true;
                user.verifiedAt = new Date();
                await user.save();

                const roleGiven = await discordService.giveRole(interaction.user.id);

                const successEmbed = new EmbedBuilder()
                    .setTitle("✅ **Comment Verification Complete!**")
                    .setDescription('Congratulations! Your YouTube verification is now complete.')
                    .addFields([
                        {
                            name: "👤 **Verified User**",
                            value: `${interaction.user}`,
                            inline: true
                        },
                        {
                            name: "🎭 **Role Status**",
                            value: roleGiven ? '✅ Role Granted' : '❌ Role Failed',
                            inline: true
                        },
                        {
                            name: "📊 **Verification Status**",
                            value: "✅ Subscriber, Liked & Commenter",
                            inline: true
                        },
                        {
                            name: '📹 **Video**',
                            value: `[Watch Video](https://youtube.com/watch?v=${videoId})`,
                            inline: false
                        },
                        {
                            name: '💬 **Your Comment**',
                            value: commentResult.commentText.substring(0, 200) + (commentResult.commentText.length > 200 ? '...' : ''),
                            inline: false
                        },
                        {
                            name: '🎉 **What\'s Next?**',
                            value: 'You now have access to exclusive channels and member perks! Welcome to the community!',
                            inline: false
                        }
                    ])
                    .setColor(0x00ff00)
                    .setFooter({ text: `${interaction.client.user.username} | YouTube Verification System` })
                    .setImage("https://images-ext-2.discordapp.net/external/NSE8BGpgc7RyRxtIPbFEJ4jNzm2TxQ6fVwV4xB-9eis/https/cdn-longterm.mee6.xyz/plugins/embeds/images/1101575916305526934/30b8e58e94fd8cc16432ff41fda7fc3741be24dc188c43a4ba4eb7a20cf51e2e.gif")
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

                try {
                    const logChannel = interaction.client.channels.cache.get(config.discord.logchannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle("🎉 New Verification Complete")
                            .setDescription(`${interaction.user.tag} has completed YouTube verification`)
                            .addFields([
                                { name: "User", value: `${interaction.user}`, inline: true },
                                { name: "Discord ID", value: interaction.user.id, inline: true },
                                { name: "Role Given", value: roleGiven ? "✅ Yes" : "❌ Failed", inline: true }
                            ])
                            .setColor(0x00ff00)
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (logError) {
                    console.error('Log channel error:', logError);
                }

                await discordService.sendDM(
                    interaction.user.id,
                    '🎉 Congratulations! Your YouTube verification has been completed successfully. You now have access to special permissions!'
                );

            } else {
                const embed = new EmbedBuilder()
                    .setColor(0xffaa00)
                    .setTitle('❌ Comment Not Found')
                    .setDescription(`I couldn't find a comment from you on the specified video.`)
                    .addFields([
                        {
                            name: '📝 **What to do next:**',
                            value: '1. Make sure you\'re logged into the **same Google account**\n2. **Comment** on the video below\n3. **Wait 2-3 minutes** for processing\n4. **Try again** with `/verify-comment`',
                            inline: false
                        },
                        {
                            name: '🔗 **Target Video**',
                            value: `[Comment on this video](https://youtube.com/watch?v=${videoId})`,
                            inline: false
                        },
                        {
                            name: '💡 **Tips**',
                            value: '• Comments must be public (not private)\n• Make sure you\'re not shadowbanned\n• Try refreshing the video page',
                            inline: false
                        }
                    ])
                    .setFooter({ text: 'If you continue having issues, contact support' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Verify-comment command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription('An error occurred during comment verification.')
                .addFields([
                    {
                        name: 'Error Details:',
                        value: error.message.substring(0, 1000)
                    },
                    {
                        name: '💡 **Possible Solutions:**',
                        value: '• Wait a few minutes and try again\n• Use `/verify` to refresh your authentication\n• Contact support if the issue persists',
                        inline: false
                    }
                ])
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
