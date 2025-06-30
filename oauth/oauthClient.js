const { google } = require('googleapis');
const config = require('../config/config');

class OAuthClient {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUri
        );
    }

    generateAuthUrl(state) {
        const scopes = [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: state,
            prompt: 'consent'
        });
    }

    async getTokens(code) {
        try {
            console.log('🔄 Token alınıyor, kod:', code);
            const { tokens } = await this.oauth2Client.getToken(code);
            
            if (!tokens) {
                throw new Error('Token alınamadı');
            }

            console.log('✅ Token alındı:', {
                access_token: tokens.access_token ? 'Var' : 'Yok',
                refresh_token: tokens.refresh_token ? 'Var' : 'Yok'
            });

            return tokens;
        } catch (error) {
            console.error('Token alım hatası:', error);
            throw error;
        }
    }

    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    async refreshAccessToken(refreshToken) {
        try {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken
            });
            
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            return credentials;
        } catch (error) {
            console.error('Token yenileme hatası:', error);
            throw error;
        }
    }

    getClient() {
        return this.oauth2Client;
    }
}

module.exports = new OAuthClient();
