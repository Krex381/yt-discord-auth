const { REST, Routes } = require('discord.js');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'bot', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`✅ Komut yüklendi: ${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
    try {
        console.log(`🔄 ${commands.length} slash command kaydediliyor...`);
        
        // Guild-specific commands (daha hızlı güncellenme için)
        const data = await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId || '1362084999204962606', config.discord.guildId),
            { body: commands }
        );
        
        console.log(`✅ ${data.length} slash command başarıyla kaydedildi!`);
        console.log('Kayıtlı komutlar:', data.map(cmd => cmd.name).join(', '));
        
    } catch (error) {
        console.error('❌ Slash command kaydetme hatası:', error);
        
        if (error.code === 50001) {
            console.log('💡 Bot yetkileri eksik olabilir. Bot\'un sunucuda yeterli yetkiye sahip olduğundan emin olun.');
        }
        
        if (error.code === 10013) {
            console.log('💡 Geçersiz Guild ID. .env dosyasındaki GUILD_ID\'yi kontrol edin.');
        }
    }
})();
