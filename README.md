# YouTube Discord Verification Bot

A comprehensive Discord bot system that provides **triple verification** for Discord servers: YouTube channel subscription, video likes, and comments. Users must complete all three verification steps to gain access to special roles and content.

## 🌟 Key Features

### 🔐 **Triple Verification System**
- **YouTube Channel Subscription**: Verify users are subscribed to your YouTube channel
- **Video Like Verification**: Ensure users have liked your specific target video
- **Comment Verification**: Confirm users have commented on your designated video

### 🚀 **Advanced Automation**
- **OAuth 2.0 Integration**: Secure Google OAuth authentication system
- **Automatic Role Management**: Instant role assignment after successful verification
- **Intelligent Periodic Checks**: Monitor user status every 5 minutes
- **Smart Revocation System**: Automatically remove roles if users unsubscribe, unlike, or delete comments
- **Real-time Status Updates**: Users get immediate feedback on their verification progress

### 💬 **User-Friendly Experience**
- **Interactive `/usage` Command**: Step-by-step guidance with current status display
- **Modern Discord Embeds**: Beautiful, dark-themed embeds with clear status indicators
- **Responsive Web Interface**: Modern, dark-themed web pages for OAuth flow
- **Comprehensive Error Handling**: Clear, actionable error messages and recovery guidance

### 🔍 **Monitoring & Management**
- **Health Check Endpoints**: Monitor system status and uptime
- **Comprehensive Logging**: Detailed logs for troubleshooting and monitoring
- **Token Management**: Automatic refresh token handling and cleanup
- **Database Integration**: MongoDB for persistent user data storage

## 📋 Requirements

- **Node.js**: Version 16 or higher
- **MongoDB**: Local or cloud instance
- **Discord Bot**: Bot token with appropriate permissions
- **Google Cloud Project**: OAuth credentials and YouTube Data API access
- **YouTube Channel**: Target channel and video for verification

## 🚀 Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/Krex381/yt-discord-auth
cd yt-discord-auth
npm install
```

### 2. Environment Configuration

Create a `.env` file with the following configuration:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
GUILD_ID=your_discord_server_id
ROLE_ID=your_special_role_id

# Google OAuth Configuration
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
REDIRECT_URI=http://localhost:80/oauth2callback

# YouTube Configuration
YOUTUBE_CHANNEL_ID=UCYourChannelIdHere
TARGET_VIDEO_ID=your_target_video_id

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ytdiscord

# Server Configuration
PORT=80
```

### 3. Google Cloud Console Setup

1. **Create a Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable APIs**:
   - Enable the **YouTube Data API v3**
   - Enable the **Google+ API** (for OAuth)

3. **Create OAuth Credentials**:
   - Go to "Credentials" section
   - Create "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Add authorized redirect URI: `http://localhost:80/oauth2callback`

4. **Get API Keys**:
   - Copy the Client ID and Client Secret to your `.env` file

### 4. Discord Bot Setup

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot

2. **Configure Bot Permissions**:
   - `Manage Roles`: To assign/remove verification roles
   - `Send Messages`: To send verification responses
   - `Use Slash Commands`: To handle bot commands
   - `Send Messages in Threads`: For thread-based communication

3. **Invite Bot to Server**:
   - Generate invite link with the required permissions
   - Add bot to your Discord server

### 5. Deploy Slash Commands

Run the command deployment script to register Discord slash commands:

```bash
node deploy-commands.js
```

This will register the following commands:
- `/verify` - Start the YouTube verification process
- `/verify-comment` - Verify comment on the target video
- `/usage` - Get step-by-step guidance and status

### 6. Start the System

```bash
npm start
```

The system will start on `http://localhost:80` and display startup logs.

## 📖 Usage Guide

### For Discord Users

#### 1. **Get Started with `/usage`**
```
/usage
```
This command provides:
- Your current verification status
- Step-by-step instructions
- Links to required actions
- Real-time progress tracking

#### 2. **Link YouTube Account with `/verify`**
```
/verify
```
This command will:
- Generate a secure OAuth link
- Guide you through Google authentication
- Verify your YouTube subscription and video like status
- Update your verification progress

#### 3. **Verify Comment with `/verify-comment`**
```
/verify-comment
```
This command will:
- Check if you've commented on the target video
- Verify the comment is still active
- Complete your verification process
- Assign the special role if all criteria are met

### Verification Process Flow

1. **Initial Status Check**: Use `/usage` to see what's required
2. **YouTube Connection**: Use `/verify` to link your YouTube account
3. **Subscription Check**: System automatically verifies you're subscribed
4. **Like Check**: System automatically verifies you've liked the target video
5. **Comment Verification**: Use `/verify-comment` to verify your comment
6. **Role Assignment**: Automatic role assignment upon completion
7. **Ongoing Monitoring**: System continuously monitors your status

### For Server Administrators

#### **System Monitoring**
- **Health Check**: `http://localhost:80/health`
- **Main Dashboard**: `http://localhost:80/`
- **Logs**: Monitor console output for system status

#### **Configuration Management**
- Update `.env` file for configuration changes
- Restart the system to apply changes
- Monitor MongoDB for user data

## 🏗 System Architecture

```
yt-discord-auth/
├── bot/                           # Discord Bot Module
│   ├── commands/                  # Slash Commands
│   │   ├── verify.js             # YouTube OAuth verification
│   │   ├── check-comment.js      # Comment verification
│   │   └── usage.js              # User guidance system
│   └── index.js                  # Bot initialization
├── oauth/                         # OAuth Authentication
│   ├── oauthClient.js            # Google OAuth client
│   └── routes.js                 # OAuth callback routes
├── services/                      # Business Logic Services
│   ├── youtubeService.js         # YouTube API interactions
│   ├── discordService.js         # Discord API interactions
│   └── tokenManager.js           # Token refresh management
├── scheduler/                     # Periodic Tasks
│   └── checkUsers.js             # User status monitoring
├── database/                      # Database Layer
│   └── userModel.js              # User data schema
├── config/                        # Configuration
│   └── config.js                 # Environment configuration
├── deploy-commands.js             # Discord command deployment
└── package.json                  # Project dependencies
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /` - System status dashboard with health information
- `GET /health` - Health check endpoint for monitoring
- `GET /oauth2callback` - Google OAuth callback handler

### Internal Endpoints
All Discord commands are handled internally through the Discord API.

## 📊 Database Schema

```javascript
// User Model Schema
{
  discordId: String,              // Discord user ID (unique)
  googleTokens: {                 // Google OAuth tokens
    access_token: String,
    refresh_token: String,
    expiry_date: Number
  },
  youtubeChannelId: String,       // User's YouTube channel ID
  isSubscribed: Boolean,          // Subscription status to target channel
  hasLiked: Boolean,              // Like status for target video
  hasCommented: Boolean,          // Comment status for target video
  commentId: String,              // ID of user's comment (if exists)
  isVerified: Boolean,            // Overall verification status
  lastChecked: Date,              // Last automatic check timestamp
  verifiedAt: Date,               // Initial verification timestamp
  createdAt: Date,                // Record creation timestamp
  updatedAt: Date                 // Last update timestamp
}
```

## ⚡ Periodic Monitoring System

The system performs automatic checks every **5 minutes** to:

### **Subscription Monitoring**
- Verify users are still subscribed to the target YouTube channel
- Handle subscription revocations with user notification
- Remove roles from users who unsubscribe

### **Like Status Monitoring**
- Check if users still have the target video liked
- Detect when users unlike the video
- Send notifications and revoke access for unlikes

### **Comment Monitoring**
- Verify comments are still present on the target video
- Detect deleted or removed comments
- Handle comment-based access revocation

### **Token Management**
- Refresh expired access tokens automatically
- Clean up invalid or revoked tokens
- Handle OAuth token errors gracefully

### **Status Synchronization**
- Update Discord roles based on current verification status
- Send direct messages for status changes
- Maintain database consistency

## 🛡 Security Features

### **OAuth 2.0 Security**
- Secure Google OAuth implementation
- Encrypted token storage
- Automatic token refresh handling
- Secure redirect URI validation

### **API Security**
- Rate limiting for YouTube API calls
- Error handling for API quota limits
- Secure credential management
- Environment variable protection

### **Discord Security**
- Permission-based role management
- User input validation
- Secure embed content
- Error message sanitization

### **Data Protection**
- Minimal data collection
- Secure database connections
- Token encryption
- Privacy-compliant logging

## 🐛 Troubleshooting

### **Common Issues**

#### **MongoDB Connection Error**
```
Error: Connection failed to MongoDB
```
**Solutions:**
- Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
- Check connection string in `.env` file
- Verify MongoDB port (default: 27017)
- Check MongoDB logs for errors

#### **Discord Bot Offline**
```
Error: Discord bot failed to login
```
**Solutions:**
- Verify `DISCORD_TOKEN` in `.env` file
- Check bot permissions in Discord server
- Ensure bot has required intents enabled
- Re-generate bot token if needed

#### **Google OAuth Error**
```
Error: OAuth authentication failed
```
**Solutions:**
- Verify `CLIENT_ID` and `CLIENT_SECRET` in `.env`
- Check redirect URI matches Google Cloud Console settings
- Ensure YouTube Data API v3 is enabled
- Check API quotas and limits

#### **YouTube API Quota Exceeded**
```
Error: YouTube API quota exceeded
```
**Solutions:**
- Wait for quota reset (daily at midnight PST)
- Optimize API calls in code
- Request quota increase from Google
- Implement request caching

#### **Role Assignment Failed**
```
Error: Failed to assign role to user
```
**Solutions:**
- Verify `ROLE_ID` in `.env` file
- Check bot has `Manage Roles` permission
- Ensure bot role is higher than target role
- Verify user is in the correct server

### **Debug Mode**

Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will provide:
- Detailed API call logs
- Database query information
- OAuth flow debugging
- Enhanced error messages

### **Log Analysis**

Monitor these log patterns:
- `✅ User verified successfully` - Successful verification
- `❌ Verification failed` - Failed verification attempt
- `🔄 Checking user status` - Periodic status check
- `⚠️ Token refresh needed` - OAuth token refresh
- `🚫 Access revoked` - User access removed

## 📈 Performance Optimization

### **YouTube API Optimization**
- Batch API requests when possible
- Implement request caching
- Use efficient query parameters
- Monitor quota usage

### **Database Optimization**
- Index frequently queried fields
- Clean up expired records
- Optimize query patterns
- Use connection pooling

### **Discord Optimization**
- Cache user and role data
- Batch role assignments
- Optimize embed generation
- Use efficient message formatting

## 🔄 System Maintenance

### **Regular Tasks**
- Monitor API quota usage
- Clean up expired tokens
- Update dependencies
- Backup database regularly

### **Updating Configuration**
- Stop the system: `Ctrl+C`
- Update `.env` file
- Restart: `npm start`
- Verify changes in logs

### **Database Maintenance**
```bash
# Connect to MongoDB
mongo
use ytdiscord

# Check user count
db.users.count()

# Clean expired tokens
db.users.deleteMany({"googleTokens.expiry_date": {$lt: new Date()}})
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
   ```bash
   git fork https://github.com/Krex381/yt-discord-auth
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

4. **Test Changes**
   - Test all verification flows
   - Check error handling
   - Verify periodic checks work

5. **Commit Changes**
   ```bash
   git commit -m 'Add amazing feature: detailed description'
   ```

6. **Push to Branch**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Create Pull Request**
   - Provide detailed description
   - Include screenshots if applicable
   - Reference any related issues

### **Code Standards**
- Use clear, descriptive variable names
- Add JSDoc comments for functions
- Follow async/await patterns
- Handle errors gracefully
- Write meaningful commit messages

## 📞 Support

### **Getting Help**

1. **Check Documentation**: Review this README thoroughly
2. **Search Issues**: Look for similar problems in the issues section
3. **Enable Debug Logging**: Set `NODE_ENV=development` for detailed logs
4. **Create Issue**: If problem persists, create a detailed issue report

### **Issue Reporting**

When reporting issues, please include:
- **System Information**: Node.js version, OS, MongoDB version
- **Error Messages**: Complete error logs and stack traces
- **Configuration**: Relevant parts of your `.env` file (without secrets)
- **Steps to Reproduce**: Detailed steps that led to the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened

### **Feature Requests**

We welcome feature requests! Please provide:
- **Use Case**: Why this feature would be useful
- **Implementation Ideas**: How you envision it working
- **Examples**: Similar features in other bots or services
- **Priority**: How important this feature is to you

---

**Built with ❤️ for Discord communities and YouTube creators**
