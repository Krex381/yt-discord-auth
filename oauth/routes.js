const express = require('express');
const router = express.Router();
const oauthClient = require('./oauthClient');
const youtubeService = require('../services/youtubeService');
const discordService = require('../services/discordService');
const User = require('../database/userModel');
const config = require('../config/config');

router.get('/oauth2callback', async (req, res) => {
    const { code, state: discordId, error } = req.query;

    if (error) {
        console.error('❌ OAuth error:', error);
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Authorization Error</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
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
                            max-width: 500px;
                            padding: 40px;
                            background: rgba(60, 30, 30, 0.8);
                            border-radius: 20px;
                            border: 1px solid rgba(255, 100, 100, 0.3);
                            backdrop-filter: blur(10px);
                            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                            text-align: center;
                        }
                        h2 {
                            background: linear-gradient(45deg, #ff4444, #cc0000);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            margin-bottom: 20px;
                            font-size: 2em;
                        }
                        p {
                            margin: 15px 0;
                            font-size: 1.1em;
                            line-height: 1.5;
                        }
                        .error-code {
                            background: rgba(0, 0, 0, 0.4);
                            padding: 10px;
                            border-radius: 8px;
                            font-family: 'Courier New', monospace;
                            margin: 20px 0;
                            color: #ff6b6b;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Authorization Error</h2>
                        <p>Google authorization failed.</p>
                        <div class="error-code">Error: ${error}</div>
                        <p>You can return to Discord and try again.</p>
                    </div>
                    <script>setTimeout(() => window.close(), 8000);</script>
                </body>
            </html>
        `);
    }

    if (!code || !discordId) {
        return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invalid Parameters</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
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
                            max-width: 500px;
                            padding: 40px;
                            background: rgba(60, 30, 30, 0.8);
                            border-radius: 20px;
                            border: 1px solid rgba(255, 100, 100, 0.3);
                            backdrop-filter: blur(10px);
                            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                            text-align: center;
                        }
                        h2 {
                            background: linear-gradient(45deg, #ff4444, #cc0000);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            margin-bottom: 20px;
                            font-size: 2em;
                        }
                        p {
                            margin: 15px 0;
                            font-size: 1.1em;
                            line-height: 1.5;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Invalid Parameters</h2>
                        <p>Required parameters not found in OAuth callback.</p>
                        <p>Please try the verification process again.</p>
                    </div>
                    <script>setTimeout(() => window.close(), 6000);</script>
                </body>
            </html>
        `);
    }

    try {
        console.log(`🔄 OAuth callback received - User: ${discordId}, Code exists: ${!!code}`);

        const tokens = await oauthClient.getTokens(code);
        
        if (!tokens.access_token) {
            throw new Error('Access token could not be obtained');
        }

        oauthClient.setCredentials(tokens);
        
        console.log('🔄 Attempting to get YouTube channel information...');
        const channelInfo = await youtubeService.getUserChannelInfo(tokens.access_token, tokens.refresh_token);
        
        if (!channelInfo) {
            console.log('⚠️ YouTube channel not found, but continuing...');
            const defaultChannelInfo = {
                id: 'unknown',
                title: 'YouTube User'
            };
            
            const isSubscribed = await youtubeService.checkSubscription(tokens.access_token, tokens.refresh_token);
            
            const hasLiked = await youtubeService.checkVideoLike(tokens.access_token, tokens.refresh_token, config.youtube.targetVideoId);
            
            const user = await User.findOneAndUpdate(
                { discordId },
                {
                    googleTokens: tokens,
                    youtubeChannelId: defaultChannelInfo.id,
                    isSubscribed,
                    hasLiked,
                    lastChecked: new Date()
                },
                { upsert: true, new: true }
            );

            if (isSubscribed) {
                res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>YouTube Verification Success</title>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
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
                                    max-width: 500px;
                                    padding: 40px;
                                    background: rgba(30, 30, 60, 0.8);
                                    border-radius: 20px;
                                    border: 1px solid rgba(255, 255, 255, 0.1);
                                    backdrop-filter: blur(10px);
                                    box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                                    text-align: center;
                                }
                                h2 {
                                    background: linear-gradient(45deg, #00ff88, #00aa55);
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    margin-bottom: 20px;
                                    font-size: 2em;
                                }
                                p {
                                    margin: 15px 0;
                                    font-size: 1.1em;
                                    line-height: 1.5;
                                }
                                code {
                                    background: rgba(0, 0, 0, 0.4);
                                    padding: 4px 8px;
                                    border-radius: 5px;
                                    color: #9b00ff;
                                    font-family: 'Courier New', monospace;
                                }
                                .channel-info {
                                    background: rgba(0, 0, 0, 0.3);
                                    padding: 15px;
                                    border-radius: 10px;
                                    margin: 20px 0;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h2>✅ YouTube Verification Status</h2>
                                <div class="channel-info">
                                    <p><strong>Channel:</strong> ${defaultChannelInfo.title}</p>
                                    <p><strong>Subscription:</strong> ${isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed'}</p>
                                    <p><strong>Like Status:</strong> ${hasLiked ? '✅ Liked' : '❌ Not Liked'}</p>
                                </div>
                                <p>Now return to Discord and use the <code>/verify-comment</code> command to complete the verification process.</p>
                            </div>
                            <script>setTimeout(() => window.close(), 8000);</script>
                        </body>
                    </html>
                `);
            } else {
                res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Subscription Not Found</title>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
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
                                    max-width: 500px;
                                    padding: 40px;
                                    background: rgba(60, 30, 30, 0.8);
                                    border-radius: 20px;
                                    border: 1px solid rgba(255, 100, 100, 0.3);
                                    backdrop-filter: blur(10px);
                                    box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                                    text-align: center;
                                }
                                h2 {
                                    background: linear-gradient(45deg, #ff4444, #cc0000);
                                    -webkit-background-clip: text;
                                    -webkit-text-fill-color: transparent;
                                    margin-bottom: 20px;
                                    font-size: 2em;
                                }
                                p {
                                    margin: 15px 0;
                                    font-size: 1.1em;
                                    line-height: 1.5;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h2>❌ Verification Incomplete</h2>
                                <p>Please subscribe to our YouTube channel and like the target video first.</p>
                            </div>
                            <script>setTimeout(() => window.close(), 5000);</script>
                        </body>
                    </html>
                `);
            }
            return;
        }

        const isSubscribed = await youtubeService.checkSubscription(tokens.access_token, tokens.refresh_token);
        
        const hasLiked = await youtubeService.checkVideoLike(tokens.access_token, tokens.refresh_token, config.youtube.targetVideoId);
        
        const user = await User.findOneAndUpdate(
            { discordId },
            {
                googleTokens: tokens,
                youtubeChannelId: channelInfo.id,
                isSubscribed,
                hasLiked,
                lastChecked: new Date()
            },
            { upsert: true, new: true }
        );

        if (isSubscribed) {
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>YouTube Verification Success</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
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
                                max-width: 500px;
                                padding: 40px;
                                background: rgba(30, 30, 60, 0.8);
                                border-radius: 20px;
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                backdrop-filter: blur(10px);
                                box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                                text-align: center;
                            }
                            h2 {
                                background: linear-gradient(45deg, #00ff88, #00aa55);
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                                margin-bottom: 20px;
                                font-size: 2em;
                            }
                            p {
                                margin: 15px 0;
                                font-size: 1.1em;
                                line-height: 1.5;
                            }
                            code {
                                background: rgba(0, 0, 0, 0.4);
                                padding: 4px 8px;
                                border-radius: 5px;
                                color: #9b00ff;
                                font-family: 'Courier New', monospace;
                            }
                            .channel-info {
                                background: rgba(0, 0, 0, 0.3);
                                padding: 15px;
                                border-radius: 10px;
                                margin: 20px 0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>✅ YouTube Subscription Verified!</h2>
                            <div class="channel-info">
                                <p><strong>Channel:</strong> ${channelInfo.title}</p>
                                <p><strong>Subscription:</strong> ${isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed'}</p>
                                <p><strong>Like Status:</strong> ${hasLiked ? '✅ Liked' : '❌ Not Liked'}</p>
                            </div>
                            <p>Now return to Discord and use the <code>/verify-comment</code> command to complete the verification process.</p>
                        </div>
                        <script>setTimeout(() => window.close(), 8000);</script>
                    </body>
                </html>
            `);
        } else {
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Subscription Not Found</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
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
                                max-width: 500px;
                                padding: 40px;
                                background: rgba(60, 30, 30, 0.8);
                                border-radius: 20px;
                                border: 1px solid rgba(255, 100, 100, 0.3);
                                backdrop-filter: blur(10px);
                                box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                                text-align: center;
                            }
                            h2 {
                                background: linear-gradient(45deg, #ff4444, #cc0000);
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                                margin-bottom: 20px;
                                font-size: 2em;
                            }
                            p {
                                margin: 15px 0;
                                font-size: 1.1em;
                                line-height: 1.5;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>❌ Subscription Not Found</h2>
                            <p>Please subscribe to our YouTube channel first.</p>
                        </div>
                        <script>setTimeout(() => window.close(), 6000);</script>
                    </body>
                </html>
            `);
        }

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Server Error</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
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
                            max-width: 500px;
                            padding: 40px;
                            background: rgba(60, 30, 30, 0.8);
                            border-radius: 20px;
                            border: 1px solid rgba(255, 100, 100, 0.3);
                            backdrop-filter: blur(10px);
                            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.3);
                            text-align: center;
                        }
                        h2 {
                            background: linear-gradient(45deg, #ff4444, #cc0000);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            margin-bottom: 20px;
                            font-size: 2em;
                        }
                        p {
                            margin: 15px 0;
                            font-size: 1.1em;
                            line-height: 1.5;
                        }
                        .error-details {
                            background: rgba(0, 0, 0, 0.4);
                            padding: 15px;
                            border-radius: 8px;
                            font-family: 'Courier New', monospace;
                            margin: 20px 0;
                            color: #ff6b6b;
                            font-size: 0.9em;
                            word-break: break-word;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>❌ Server Error</h2>
                        <p>An error occurred during the verification process.</p>
                        <div class="error-details">${error.message}</div>
                        <p>Please try again or contact support if the problem persists.</p>
                    </div>
                    <script>setTimeout(() => window.close(), 10000);</script>
                </body>
            </html>
        `);
    }
});

module.exports = router;
