# 🔄 Google Calendar Integration Setup

This guide will help you set up Google Calendar integration for your AI Voice Network Assistant so you can ask questions like "Who am I meeting with next?" and "What's my schedule today?"

## Prerequisites

- Google Cloud Console account
- Google Calendar with events to test
- Your AI Voice Network Assistant already running

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - Choose "External" for testing
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`
4. Create OAuth client ID:
   - Application type: "Web application"
   - Name: "AI Voice Network Assistant"
   - Authorized redirect URIs: 
     - `http://localhost:3000/api/auth/callback/google`
     - Add your production URL if deploying: `https://yourdomain.com/api/auth/callback/google`

## Step 3: Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

## Step 4: Install Dependencies

Install the required packages:

```bash
# Frontend dependencies
pnpm install googleapis next-auth

# Python dependencies
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

## Step 5: Test Authentication

1. Start your application:
   ```bash
   pnpm dev
   python agent.py
   ```

2. Open your browser to `http://localhost:3000`
3. Look for the "Connect Google Calendar" section
4. Click "Connect Google Calendar" and authenticate with Google
5. Grant permissions for calendar read access

## Step 6: Test Voice Commands

Once authenticated, try these voice commands:

- **"Who am I meeting with next?"** - Get your next upcoming meeting
- **"What's my schedule today?"** - See all meetings for today
- **"When am I meeting with [person name]?"** - Find meetings with specific people
- **"What's coming up this week?"** - Get upcoming meetings
- **"Show me today's meetings"** - Alternative way to get today's schedule

## Troubleshooting

### Authentication Issues

**Error: "redirect_uri_mismatch"**
- Check that your redirect URI in Google Cloud Console matches exactly: `http://localhost:3000/api/auth/callback/google`
- For production, use your actual domain

**Error: "invalid_client"**
- Verify your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure there are no extra spaces or characters

### Calendar Access Issues

**"I'm having trouble accessing your calendar"**
- Ensure you've granted calendar permissions during OAuth
- Check that the Google Calendar API is enabled in your Google Cloud project
- Verify your calendar has events to test with

**No events returned**
- Make sure you have upcoming events in your Google Calendar
- Check that events are in your primary calendar
- Verify the time zone settings

### Python Calendar Service Issues

**Import errors for Google libraries**
- Run: `pip install -r requirements.txt`
- Ensure all Google API dependencies are installed

**Authentication token expired**
- The system will automatically refresh tokens
- If issues persist, disconnect and reconnect your Google Calendar

## Security Notes

- **Read-only access**: The integration only requests `calendar.readonly` scope
- **Local storage**: OAuth tokens are stored locally and securely
- **No data sharing**: Your calendar data is never sent to external services except Google's own APIs
- **Automatic refresh**: Tokens are automatically refreshed when they expire

## Usage Examples

### Basic Queries
```
"Who am I meeting with next?"
→ "You have 'Project Review' at 2:00 PM today with Sarah Johnson."

"What's my schedule today?"
→ "You have 3 meetings today. 1. Stand-up at 9:00 AM with the dev team..."
```

### Advanced Queries
```
"When am I meeting with Sarah?"
→ "I found 2 meetings with Sarah. 1. Project Review at 2:00 PM today..."

"What's coming up this week?"
→ "You have 8 meetings coming up. 1. Stand-up at 9:00 AM tomorrow..."
```

## Production Deployment

For production deployment:

1. Update your Google Cloud OAuth settings:
   - Add your production domain to authorized origins
   - Add production callback URL: `https://yourdomain.com/api/auth/callback/google`

2. Update environment variables:
   ```bash
   NEXTAUTH_URL=https://yourdomain.com
   ```

3. Consider using a more secure secret for `NEXTAUTH_SECRET`

## API Rate Limits

Google Calendar API has the following limits:
- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 1,000

These limits are generous for typical usage patterns.

## Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Check the terminal output for Python errors
3. Verify all environment variables are set correctly
4. Ensure your Google Cloud project has the Calendar API enabled
5. Test with a simple calendar event first

For more help, refer to:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google Cloud Console](https://console.cloud.google.com/) 