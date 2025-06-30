const { Client } = require('discord.js');
const config = require('../config/config');

class DiscordService {
    constructor() {
        this.client = null;
    }

    setClient(client) {
        this.client = client;
    }

    // Give role to user
    async giveRole(userId) {
        try {
            const guild = this.client.guilds.cache.get(config.discord.guildId);
            if (!guild) {
                console.error('Guild not found');
                return false;
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                console.error('Member not found');
                return false;
            }

            const role = guild.roles.cache.get(config.discord.roleId);
            if (!role) {
                console.error('Role not found');
                return false;
            }

            await member.roles.add(role);
            console.log(`${member.user.tag} received ${role.name} role`);
            return true;
        } catch (error) {
            console.error('Role assignment error:', error);
            return false;
        }
    }

    // Remove role from user
    async removeRole(userId) {
        try {
            const guild = this.client.guilds.cache.get(config.discord.guildId);
            if (!guild) {
                console.error('Guild not found');
                return false;
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                console.error('Member not found');
                return false;
            }

            const role = guild.roles.cache.get(config.discord.roleId);
            if (!role) {
                console.error('Role not found');
                return false;
            }

            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`${member.user.tag} lost ${role.name} role`);
            }
            
            return true;
        } catch (error) {
            console.error('Role removal error:', error);
            return false;
        }
    }

    // Check if user has role
    async hasRole(userId) {
        try {
            const guild = this.client.guilds.cache.get(config.discord.guildId);
            if (!guild) return false;

            const member = await guild.members.fetch(userId);
            if (!member) return false;

            return member.roles.cache.has(config.discord.roleId);
        } catch (error) {
            console.error('Role check error:', error);
            return false;
        }
    }

    // Send DM to user (supports both string and embed)
    async sendDM(userId, content) {
        try {
            const user = await this.client.users.fetch(userId);
            
            // Check if content is an object with embeds or a string
            if (typeof content === 'string') {
                await user.send(content);
            } else {
                await user.send(content);
            }
            
            return true;
        } catch (error) {
            console.error('DM sending error:', error);
            return false;
        }
    }
}

module.exports = new DiscordService();
