const express = require('express');
const mongoose = require('mongoose');
const DiscordBot = require('./bot/index');
const oauthRoutes = require('./oauth/routes');
const userChecker = require('./scheduler/checkUsers');
const config = require('./config/config');

class Application {
    constructor() {
        this.app = express();
        this.bot = new DiscordBot();
        this.setupExpress();
    }

    setupExpress() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use('/', oauthRoutes);

        this.app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>YouTube Discord Verifier</title>
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
                                color: #ffffff;
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .container {
                                max-width: 800px;
                                margin: 0 auto;
                                padding: 40px;
                                background: rgba(30, 30, 60, 0.8);
                                border-radius: 20px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                backdrop-filter: blur(10px);
                                box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                            }
                            h1 {
                                text-align: center;
                                margin-bottom: 30px;
                                font-size: 2.5em;
                                background: linear-gradient(45deg, #9b00ff, #ff006e);
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                                background-clip: text;
                            }
                            .status {
                                padding: 25px;
                                background: rgba(0, 0, 0, 0.3);
                                border-radius: 15px;
                                margin-bottom: 30px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                            }
                            .status h3 {
                                margin-bottom: 20px;
                                color: #9b00ff;
                                font-size: 1.3em;
                            }
                            .status p {
                                margin: 10px 0;
                                font-size: 1.1em;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            }
                            .usage {
                                background: rgba(0, 0, 0, 0.2);
                                padding: 25px;
                                border-radius: 15px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                            }
                            .usage h3 {
                                margin-bottom: 20px;
                                color: #ff006e;
                                font-size: 1.3em;
                            }
                            .steps {
                                list-style: none;
                                counter-reset: step-counter;
                            }
                            .steps li {
                                counter-increment: step-counter;
                                margin: 15px 0;
                                padding: 15px;
                                background: rgba(255, 255, 255, 0.05);
                                border-radius: 10px;
                                position: relative;
                                padding-left: 60px;
                                font-size: 1.1em;
                            }
                            .steps li::before {
                                content: counter(step-counter);
                                position: absolute;
                                left: 15px;
                                top: 50%;
                                transform: translateY(-50%);
                                background: linear-gradient(45deg, #9b00ff, #ff006e);
                                color: white;
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                            }
                            code {
                                background: rgba(0, 0, 0, 0.4);
                                padding: 4px 8px;
                                border-radius: 5px;
                                color: #9b00ff;
                                font-family: 'Courier New', monospace;
                            }
                            .pulse {
                                animation: pulse 2s infinite;
                            }
                            @keyframes pulse {
                                0% { opacity: 1; }
                                50% { opacity: 0.7; }
                                100% { opacity: 1; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🤖 YouTube Discord Verifier</h1>
                            <div class="status">
                                <h3>System Status:</h3>
                                <p>✅ OAuth Server: Active</p>
                                <p>✅ Discord Bot: ${this.bot.getClient().isReady() ? 'Connected' : '<span class="pulse">Connecting...</span>'}</p>
                                <p>✅ Database: ${mongoose.connection.readyState === 1 ? 'Connected' : '<span class="pulse">Connecting...</span>'}</p>
                            </div>
                            <div class="usage">
                                <h3>How to Use:</h3>
                                <ol class="steps">
                                    <li>Use <code>/verify</code> command in Discord</li>
                                    <li>Login with your YouTube account</li>
                                    <li>After subscription verification, use <code>/verify-comment</code> command</li>
                                    <li>If comment verification succeeds, you'll receive special role</li>
                                </ol>
                            </div>
                            <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(0, 0, 0, 0.2); border-radius: 15px;">
                                <p style="margin-bottom: 15px; color: #9b00ff; font-weight: bold;">Legal Information:</p>
                                <a href="/privacy" style="color: #ff006e; text-decoration: none; margin: 0 15px; padding: 8px 16px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; transition: all 0.3s;">Privacy Policy</a>
                                <a href="/terms" style="color: #ff006e; text-decoration: none; margin: 0 15px; padding: 8px 16px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; transition: all 0.3s;">Terms of Service</a>
                            </div>
                        </div>
                    </body>
                </html>
            `);
        });

        this.app.get('/privacy', (req, res) => {
            res.send(`

                <!DOCTYPE html>

                <html lang="en">

                <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - YouTube Discord Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            color: #ffffff;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: rgba(30, 30, 60, 0.8);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
        }
        h1 {
            background: linear-gradient(45deg, #9b00ff, #ff006e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            border-bottom: 2px solid #9b00ff;
            padding-bottom: 10px;
        }
        h2 {
            color: #ff006e;
            margin-top: 30px;
        }
        .highlight {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-left: 4px solid #9b00ff;
            margin: 20px 0;
            border-radius: 5px;
        }
        ul {
            padding-left: 20px;
        }
        a {
            color: #9b00ff;
            text-decoration: none;
        }
        a:hover {
            color: #ff006e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Privacy Policy</h1>
        
        <div class="highlight">
            <strong>Last Updated:</strong> June 30, 2025
        </div>

        <h2>What We Access</h2>
        <p>Our YouTube Discord verification system accesses your YouTube account through Google OAuth 2.0 to verify:</p>
        <ul>
            <li>Your subscription status to specific YouTube channels</li>
            <li>Your likes on designated videos</li>
            <li>Your comments on specific videos</li>
            <li>Basic profile information (channel ID)</li>
        </ul>

        <h2>How We Use Your Data</h2>
        <p>We use this information solely to:</p>
        <ul>
            <li>Verify your eligibility for Discord server access</li>
            <li>Assign appropriate roles in Discord servers</li>
            <li>Monitor ongoing compliance with verification requirements</li>
        </ul>

        <h2>Data Storage</h2>
        <p>We store minimal data including your Discord ID, verification status, and OAuth tokens. Your YouTube content and personal information are not stored or shared.</p>

        <h2>Data Protection</h2>
        <p>All data is accessed in read-only mode. We cannot modify your YouTube account, subscriptions, or comments. OAuth tokens are securely encrypted and automatically refreshed.</p>

        <h2>Your Rights</h2>
        <p>You can revoke access at any time through your Google Account settings. Upon revocation, your verification status will be removed and stored tokens will be deleted.</p>

        <h2>Contact</h2>
        <p>For privacy concerns, please contact us through our Discord server or email support.</p>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="/">← Back to Home</a>
        </div>
    </div>
</body>
</html>
            `);
        });

        this.app.get('/terms', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - YouTube Discord Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            color: #ffffff;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: rgba(30, 30, 60, 0.8);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
        }
        h1 {
            background: linear-gradient(45deg, #9b00ff, #ff006e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            border-bottom: 2px solid #9b00ff;
            padding-bottom: 10px;
        }
        h2 {
            color: #ff006e;
            margin-top: 30px;
        }
        .highlight {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-left: 4px solid #9b00ff;
            margin: 20px 0;
            border-radius: 5px;
        }
        .warning {
            background: rgba(255, 193, 7, 0.1);
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        ul {
            padding-left: 20px;
        }
        a {
            color: #9b00ff;
            text-decoration: none;
        }
        a:hover {
            color: #ff006e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Terms of Service</h1>
        
        <div class="highlight">
            <strong>Last Updated:</strong> June 30, 2025
        </div>

        <h2>Service Description</h2>
        <p>Our YouTube Discord verification service validates your subscription, likes, and comments on specific YouTube content to grant access to Discord server features and roles.</p>

        <h2>User Requirements</h2>
        <p>To use this service, you must:</p>
        <ul>
            <li>Have a valid Google/YouTube account</li>
            <li>Be a member of the designated Discord server</li>
            <li>Complete all required verification steps (subscribe, like, comment)</li>
            <li>Maintain compliance with verification requirements</li>
        </ul>

        <h2>Verification Process</h2>
        <p>Verification involves connecting your YouTube account via Google OAuth 2.0. The system will check your subscription status, video likes, and comments in real-time.</p>

        <h2>Ongoing Monitoring</h2>
        <p>Your verification status is periodically checked. If you unsubscribe, unlike videos, or delete comments, your Discord roles may be automatically removed.</p>

        <div class="warning">
            <strong>Important:</strong> This service operates independently of YouTube and Discord. We are not responsible for changes to their platforms or policies.
        </div>

        <h2>Limitations</h2>
        <p>We reserve the right to:</p>
        <ul>
            <li>Modify verification requirements</li>
            <li>Suspend or terminate access</li>
            <li>Update these terms with notice</li>
        </ul>

        <h2>Disclaimers</h2>
        <p>This service is provided "as is" without warranties. We are not liable for any issues arising from YouTube or Discord platform changes, API limitations, or verification failures.</p>

        <h2>Contact</h2>
        <p>For questions about these terms, please contact us through our Discord server.</p>
        
        <div style="text-align: center; margin-top: 40px;">
            <a href="/">← Back to Home</a>
        </div>
    </div>
</body>
</html>
            `);
        });

        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                discord: this.bot.getClient().isReady(),
                database: mongoose.connection.readyState === 1
            });
        });
    }

    async connectDatabase() {
        try {
            await mongoose.connect(config.database.mongoUri);
            console.log('✅ MongoDB bağlantısı başarılı');
        } catch (error) {
            console.error('❌ MongoDB bağlantı hatası:', error);
            process.exit(1);
        }
    }

    async start() {
        try {
            await this.connectDatabase();

            await this.bot.start();

            this.app.listen(config.server.port, () => {
                console.log(`🌐 OAuth sunucusu çalışıyor: http://localhost:${config.server.port}`);
            });

            userChecker.startScheduler();

            console.log('🚀 Sistem başarıyla başlatıldı!');

        } catch (error) {
            console.error('❌ Sistem başlatma hatası:', error);
            process.exit(1);
        }
    }
}

const app = new Application();
app.start();

process.on('SIGINT', async () => {
    console.log('\n🛑 Sistem kapatılıyor...');
    
    try {
        await mongoose.connection.close();
        console.log('✅ Veritabanı bağlantısı kapatıldı');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Kapatma hatası:', error);
        process.exit(1);
    }
});
