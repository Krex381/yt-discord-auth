const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/userModel');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usage')
        .setDescription('Learn how to use the YouTube verification system'),

    async execute(interaction) {
        try {
            const user = await User.findOne({ discordId: interaction.user.id });
            
            let currentStep = 0;
            let statusText = '';
            let nextStepText = '';
            
            if (!user) {
                currentStep = 0;
                statusText = '❌ Not started';
                nextStepText = 'Use `/verify` command to begin';
            } else if (!user.isSubscribed || !user.hasLiked) {
                currentStep = 1;
                const missing = [];
                if (!user.isSubscribed) missing.push('subscription');
                if (!user.hasLiked) missing.push('like');
                statusText = `⚠️ ${missing.join(' & ')} pending`;
                nextStepText = 'Complete subscription & like, then use `/verify`';
            } else if (!user.hasCommented) {
                currentStep = 2;
                statusText = '⚠️ Comment verification pending';
                nextStepText = 'Comment on the video and use `/verify-comment`';
            } else if (user.isVerified) {
                currentStep = 3;
                statusText = '✅ Fully verified';
                nextStepText = 'All done! Enjoy your perks!';
            }

            const embed = new EmbedBuilder()
                .setTitle('🎯 YouTube Verification Guide')
                .setDescription('Follow these steps to get verified and receive special Discord perks!')
                .addFields([
                    {
                        name: '📊 **Your Current Status**',
                        value: `${statusText}\n*${nextStepText}*`,
                        inline: false
                    },
                    {
                        name: `${currentStep >= 1 ? '✅' : '1️⃣'} **Step 1: Subscribe & Like**`,
                        value: `• Subscribe to our YouTube channel\n• Like our videos\n• Use \`/verify\` command`,
                        inline: false
                    },
                    {
                        name: `${currentStep >= 2 ? '✅' : '2️⃣'} **Step 2: Comment Verification**`,
                        value: `• Comment on the designated video\n• Use \`/verify-comment\` command\n• Your comment will be verified`,
                        inline: false
                    },
                    {
                        name: `${currentStep >= 3 ? '✅' : '3️⃣'} **Step 3: Get Your Role**`,
                        value: `• Receive special Discord role\n• Access exclusive channels\n• Enjoy member perks`,
                        inline: false
                    },
                    {
                        name: '📺 **Required Video**',
                        value: `[Click here to watch](https://youtube.com/watch?v=${config.youtube.targetVideoId})`,
                        inline: true
                    },
                    {
                        name: '🔗 **Verification Portal**',
                        value: `[Open Verification](http://localhost:${config.server.port})`,
                        inline: true
                    }
                ])
                .setColor(currentStep >= 3 ? 0x00ff00 : currentStep >= 1 ? 0xffaa00 : 0x9b00ff)
                .setFooter({ 
                    text: 'YouTube Discord Verifier | Step-by-step Guide',
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/1384/1384012.png'
                })
                .setImage("https://images-ext-2.discordapp.net/external/NSE8BGpgc7RyRxtIPbFEJ4jNzm2TxQ6fVwV4xB-9eis/https/cdn-longterm.mee6.xyz/plugins/embeds/images/1101575916305526934/30b8e58e94fd8cc16432ff41fda7fc3741be24dc188c43a4ba4eb7a20cf51e2e.gif")
                .setTimestamp();

            if (currentStep === 0) {
                embed.addFields([
                    {
                        name: '🚀 **Getting Started**',
                        value: 'Ready to begin? Click the verification portal link above or use `/verify` command!',
                        inline: false
                    }
                ]);
            } else if (currentStep === 1) {
                embed.addFields([
                    {
                        name: '💬 **Next: Comment**',
                        value: 'Great! You\'re subscribed. Now comment on our video and use `/verify-comment`',
                        inline: false
                    }
                ]);
            } else if (currentStep === 2) {
                embed.addFields([
                    {
                        name: '🎉 **Almost There!**',
                        value: 'Just verify your comment and you\'ll get your special role!',
                        inline: false
                    }
                ]);
            } else if (currentStep === 3) {
                embed.addFields([
                    {
                        name: '🌟 **Welcome to the Community!**',
                        value: 'You\'re all set! Thanks for being part of our community.',
                        inline: false
                    }
                ]);
            }

            await interaction.reply({ 
                embeds: [embed],
                flags: 64
            });

        } catch (error) {
            console.error('Usage command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription('An error occurred while checking your verification status.')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [errorEmbed], 
                flags: 64
            });
        }
    }
};
