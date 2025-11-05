# Google Calendar Integration Setup Guide

## Prerequisites

1. **Google Cloud Console Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials

2. **Environment Variables**
   Create a `.env` file in the server directory with:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   SESSION_SECRET=your_session_secret_key_here
   PORT=5000
   ```

## Google Cloud Console Configuration

### Step 1: Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click "Enable"

### Step 2: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
   - `http://localhost:5000/api/google/auth/google/callback`

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Kairos Calendar"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/calendar.readonly`
   - `../auth/calendar.events`

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Set Environment Variables**
   Copy the example `.env` file and fill in your Google credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start the Servers**
   ```bash
   # Terminal 1 - Backend
   cd server && npm start
   
   # Terminal 2 - Frontend
   cd client && npm start
   ```

## Features Implemented

### ✅ Google OAuth Integration
- Sign in with Google button
- OAuth callback handling
- Session management
- User profile display

### ✅ Calendar Integration
- Fetch Google Calendar events
- Display events in local calendar
- Toggle Google events visibility
- Visual distinction (green border for Google events)

### ✅ Event Management
- Create events in Google Calendar
- Read-only display of Google events
- Local event editing (Google events are read-only)

## Usage

1. **Sign In**: Click "Sign in with Google" button
2. **Authorize**: Grant calendar permissions
3. **View Events**: Google events appear with green borders
4. **Toggle**: Use "Show/Hide Google Events" to control visibility
5. **Sign Out**: Click "Sign Out" to disconnect

## API Endpoints

- `GET /api/google/auth/google` - Initiate OAuth flow
- `GET /api/google/auth/google/callback` - OAuth callback
- `GET /api/google/auth/status` - Check auth status
- `GET /api/google/events` - Fetch Google Calendar events
- `POST /api/google/events` - Create Google Calendar event
- `POST /api/google/auth/logout` - Sign out

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Ensure callback URL matches exactly in Google Console
   - Check both localhost:3001 and localhost:5000 URLs

2. **"access_denied"**
   - Check OAuth consent screen configuration
   - Ensure all required scopes are added

3. **"invalid_client"**
   - Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Check that credentials are for the correct project

4. **Events not loading**
   - Check browser console for errors
   - Verify Google Calendar API is enabled
   - Check network tab for failed requests

### Debug Mode
Enable debug logging by setting `DEBUG=true` in environment variables.

## Security Notes

- Never commit `.env` file to version control
- Use HTTPS in production
- Set `secure: true` for session cookies in production
- Regularly rotate session secrets

## Next Steps

Potential enhancements:
- Sync local events to Google Calendar
- Two-way synchronization
- Multiple calendar support
- Event conflict resolution
- Recurring event support
