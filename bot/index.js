const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
const config = require('../config/config');
const discordService = require('../services/discordService');

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.client.commands = new Collection();
        this.loadCommands();
        this.loadEvents();
        
        
        discordService.setClient(this.client);
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
                console.log(`✅ Komut yüklendi: ${command.data.name}`);
            } else {
                console.log(`❌ Geçersiz komut dosyası: ${file}`);
            }
        }
    }

    loadEvents() {
        
        this.client.once('ready', () => {
            console.log(`🤖 Bot aktif: ${this.client.user.tag}`);
            console.log(`📊 Sunucu sayısı: ${this.client.guilds.cache.size}`);
        });

        
        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ Komut bulunamadı: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Komut hatası (${interaction.commandName}):`, error);
                
                const errorMessage = {
                    content: 'Bu komutu çalıştırırken bir hata oluştu!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        });
    }

    async start() {
        try {
            await this.client.login(config.discord.token);
        } catch (error) {
            console.error('❌ Bot başlatma hatası:', error);
            process.exit(1);
        }
    }

    getClient() {
        return this.client;
    }
}

module.exports = DiscordBot;
