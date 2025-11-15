# Outlook Calendar Integration Setup Guide

## Prerequisites

1. **Microsoft Azure Portal Setup**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a new Azure AD App Registration or use existing one
   - Configure API permissions for Microsoft Graph
   - Create client secret

2. **Environment Variables**
   Add to your `.env` file in the server directory:
   ```
   OUTLOOK_CLIENT_ID=your_outlook_client_id_here
   OUTLOOK_CLIENT_SECRET=your_outlook_client_secret_here
   OUTLOOK_REDIRECT_URI=http://localhost:5001/api/outlook/auth/microsoft/callback
   SESSION_SECRET=your_session_secret_key_here
   PORT=5001
   ```

## Azure Portal Configuration

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in:
   - **Name**: "Althy Planner" (or your app name)
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: 
     - Platform: Web
     - URL: `http://localhost:5001/api/outlook/auth/microsoft/callback`
5. Click "Register"

### Step 2: Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add the following permissions:
   - `User.Read` - Read user profile
   - `Calendars.Read` - Read user calendars
   - `Calendars.ReadWrite` - Read and write user calendars
6. Click "Add permissions"
7. **Important**: Click "Grant admin consent" if you're an admin (for testing)

### Step 3: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description: "Althy Planner Secret"
4. Choose expiration (recommended: 24 months for development)
5. Click "Add"
6. **Copy the secret value immediately** - it won't be shown again
7. Add this to your `.env` file as `OUTLOOK_CLIENT_SECRET`

### Step 4: Get Client ID

1. In your app registration, go to "Overview"
2. Copy the "Application (client) ID"
3. Add this to your `.env` file as `OUTLOOK_CLIENT_ID`

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd server
   npm install @azure/msal-node @microsoft/microsoft-graph-client @azure/identity
   ```

2. **Set Environment Variables**
   Update your `.env` file with:
   ```env
   OUTLOOK_CLIENT_ID=your_client_id_from_azure
   OUTLOOK_CLIENT_SECRET=your_client_secret_from_azure
   OUTLOOK_REDIRECT_URI=http://localhost:5001/api/outlook/auth/microsoft/callback
   SESSION_SECRET=your_session_secret_key_here
   PORT=5001
   ```

3. **Start the Servers**
   ```bash
   # Terminal 1 - Backend
   cd server && npm start
   
   # Terminal 2 - Frontend
   cd client && npm start
   ```

## Features Implemented

### ✅ Outlook OAuth Integration
- Sign in with Microsoft button
- OAuth callback handling
- Session management
- User profile display

### ✅ Calendar Integration
- Fetch Outlook Calendar events
- Display events in local calendar
- Visual distinction (blue border for Outlook events)
- Toggle Outlook events visibility

### ✅ Event Management
- Create events in Outlook Calendar
- Read-only display of Outlook events
- Local event editing (Outlook events are read-only)

## Usage

1. **Sign In**: Click "Connect" button next to Outlook Calendar in Profile page
2. **Authorize**: Grant calendar permissions in Microsoft login page
3. **View Events**: Outlook events appear with blue borders in calendar
4. **Toggle**: Use calendar controls to show/hide Outlook events
5. **Sign Out**: Click "Disconnect" to disconnect Outlook

## API Endpoints

- `GET /api/outlook/auth/microsoft` - Initiate OAuth flow
- `GET /api/outlook/auth/microsoft/callback` - OAuth callback
- `GET /api/outlook/auth/status` - Check auth status
- `GET /api/outlook/events` - Fetch Outlook Calendar events
- `POST /api/outlook/events` - Create Outlook Calendar event
- `POST /api/outlook/auth/logout` - Sign out

## Troubleshooting

### Common Issues

1. **"AADSTS50011: The redirect URI specified in the request does not match"**
   - Ensure redirect URI in Azure Portal matches exactly: `http://localhost:5001/api/outlook/auth/microsoft/callback`
   - Check for trailing slashes or protocol mismatches (http vs https)

2. **"AADSTS70011: Invalid scope"**
   - Verify API permissions are configured correctly in Azure Portal
   - Ensure admin consent is granted for the permissions

3. **"invalid_client"**
   - Verify OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET in `.env`
   - Check that client secret hasn't expired

4. **"Events not loading"**
   - Check browser console for errors
   - Verify Microsoft Graph API permissions are granted
   - Check network tab for failed requests
   - Ensure session is maintained (check cookies)

5. **"Token expired"**
   - Reconnect Outlook account
   - Check that refresh token logic is working
   - Verify session is not expiring too quickly

### Debug Mode

Enable debug logging by checking server console output. For more detailed logging, you can add:
```javascript
console.log('Outlook auth request:', req.session.outlookTokens);
```

## Security Notes

- Never commit `.env` file to version control
- Use HTTPS in production
- Set `secure: true` for session cookies in production
- Regularly rotate client secrets
- Use environment-specific redirect URIs (different for dev/prod)
- Consider using Azure Key Vault for secrets in production

## Production Deployment

For production, update:

1. **Redirect URIs** in Azure Portal:
   - Add your production URL: `https://yourdomain.com/api/outlook/auth/microsoft/callback`

2. **Environment Variables**:
   ```env
   OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/outlook/auth/microsoft/callback
   ```

3. **Session Configuration**:
   ```javascript
   cookie: {
     secure: true, // HTTPS only
     sameSite: 'strict',
     maxAge: 24 * 60 * 60 * 1000
   }
   ```

## Next Steps

Potential enhancements:
- Token refresh implementation
- Two-way synchronization
- Multiple calendar support
- Event conflict resolution
- Recurring event support
- Calendar selection (not just primary calendar)

