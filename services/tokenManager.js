const User = require('../database/userModel');

class TokenManager {
    // Token'ın süresi dolmuş mu kontrol et
    isTokenExpired(tokens) {
        if (!tokens.expiry_date) return true;
        return Date.now() >= tokens.expiry_date;
    }

    // Token'ı yenileme gerekli mi kontrol et (5 dakika kala yenile)
    needsRefresh(tokens) {
        if (!tokens.expiry_date) return true;
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
        return fiveMinutesFromNow >= tokens.expiry_date;
    }

    // Kullanıcının token'ını güncelle
    async updateUserTokens(userId, newTokens) {
        try {
            await User.findOneAndUpdate(
                { discordId: userId },
                { 
                    googleTokens: newTokens,
                    lastChecked: new Date()
                }
            );
            return true;
        } catch (error) {
            console.error('Token güncelleme hatası:', error);
            return false;
        }
    }

    // Geçersiz token'lı kullanıcıları temizle
    async cleanupInvalidTokens() {
        try {
            const result = await User.deleteMany({
                'googleTokens.refresh_token': { $exists: false }
            });
            
            console.log(`${result.deletedCount} geçersiz token temizlendi`);
            return result.deletedCount;
        } catch (error) {
            console.error('Token temizleme hatası:', error);
            return 0;
        }
    }
}

module.exports = new TokenManager();
