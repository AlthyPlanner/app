const express = require('express');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const router = express.Router();

// Only initialize MSAL if credentials are provided
let pca = null;
if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) {
  const msalConfig = {
    auth: {
      clientId: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      authority: 'https://login.microsoftonline.com/common' // Supports both personal and work accounts
    }
  };
  
  console.log('Initializing MSAL with Client ID:', process.env.OUTLOOK_CLIENT_ID);
  console.log('Client Secret length:', process.env.OUTLOOK_CLIENT_SECRET?.length || 0);
  
  try {
    pca = new ConfidentialClientApplication(msalConfig);
    console.log('MSAL initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MSAL:', error);
  }
}

// Helper function to get Microsoft Graph client
function getGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}


// Initiate OAuth flow
router.get('/auth/microsoft', async (req, res) => {
  if (!pca) {
    return res.status(503).json({ error: 'Outlook Calendar integration is not configured' });
  }
  try {
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:5001/api/outlook/auth/microsoft/callback';
    
    console.log('Initiating Outlook OAuth flow with:');
    console.log('- Client ID:', process.env.OUTLOOK_CLIENT_ID);
    console.log('- Redirect URI:', redirectUri);
    console.log('- Authority:', 'https://login.microsoftonline.com/common');
    
    const authCodeUrlParameters = {
      scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: redirectUri,
      prompt: 'select_account' // Force account selection
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    console.log('Generated auth URL:', authUrl.substring(0, 100) + '...');
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Outlook auth:', error);
    console.error('Error details:', error.message, error.stack);
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
    res.redirect(`${frontendUrl}/app/profile?error=outlook_auth_failed&details=${encodeURIComponent(error.message)}`);
  }
});

// Test endpoint to verify configuration
router.get('/test', (req, res) => {
  res.json({
    configured: !!pca,
    clientId: process.env.OUTLOOK_CLIENT_ID || 'NOT SET',
    clientSecretSet: !!process.env.OUTLOOK_CLIENT_SECRET,
    redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'NOT SET',
    authority: 'https://login.microsoftonline.com/common'
  });
});

// OAuth callback
router.get('/auth/microsoft/callback', async (req, res) => {
  if (!pca) {
    console.error('MSAL not initialized in callback');
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
    return res.redirect(`${frontendUrl}/app/profile?error=outlook_auth_failed`);
  }
  try {
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error('OAuth error in callback:', error, error_description);
      const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
      return res.redirect(`${frontendUrl}/app/profile?error=outlook_auth_failed&details=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code) {
      console.error('No authorization code in callback');
      const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
      return res.redirect(`${frontendUrl}/app/profile?error=outlook_auth_failed&details=no_code`);
    }

    const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:5001/api/outlook/auth/microsoft/callback';
    console.log('Exchanging code for token with redirect URI:', redirectUri);

    const tokenRequest = {
      code: code,
      scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: redirectUri
    };

    const response = await pca.acquireTokenByCode(tokenRequest);
    console.log('Token acquired successfully');
    
    // Store tokens in session
    req.session.outlookTokens = {
      accessToken: response.accessToken,
      refreshToken: response.account?.homeAccountId,
      account: {
        id: response.account?.homeAccountId,
        name: response.account?.name,
        username: response.account?.username
      }
    };

    // Get user profile
    const graphClient = getGraphClient(response.accessToken);
    const user = await graphClient.api('/me').get();
    
    req.session.outlookUser = {
      id: user.id,
      email: user.mail || user.userPrincipalName,
      name: user.displayName
    };

    const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
    res.redirect(`${frontendUrl}/app/profile?outlook_auth=success`);
  } catch (error) {
    console.error('Error in Outlook callback:', error);
    res.redirect('http://localhost:3001/app/profile?error=outlook_auth_failed');
  }
});

// Check authentication status
router.get('/auth/status', (req, res) => {
  if (req.session.outlookTokens && req.session.outlookUser) {
    res.json({
      authorized: true,
      user: req.session.outlookUser,
      hasTokens: !!req.session.outlookTokens.accessToken
    });
  } else {
    res.json({ authorized: false });
  }
});

// Get Outlook Calendar events
router.get('/events', async (req, res) => {
  if (!pca) {
    return res.status(503).json({ error: 'Outlook Calendar integration is not configured' });
  }
  try {
    if (!req.session.outlookTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const graphClient = getGraphClient(req.session.outlookTokens.accessToken);
    
    // Get events for the next 30 days
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const events = await graphClient
      .api('/me/calendar/events')
      .filter(`start/dateTime ge '${now.toISOString()}' and start/dateTime le '${endDate.toISOString()}'`)
      .orderby('start/dateTime')
      .top(50)
      .get();

    const formattedEvents = events.value.map(event => ({
      id: event.id,
      summary: event.subject || 'No Title',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.body?.content || '',
      location: event.location?.displayName || '',
      source: 'outlook'
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching Outlook Calendar events:', error);
    
    // Try to refresh token if expired
    if (error.statusCode === 401 && req.session.outlookTokens.refreshToken) {
      try {
        // Token refresh logic would go here
        // For now, return error
        return res.status(401).json({ error: 'Token expired. Please reconnect.' });
      } catch (refreshError) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }
    
    res.status(500).json({ error: 'Failed to fetch Outlook Calendar events' });
  }
});

// Create event in Outlook Calendar
router.post('/events', async (req, res) => {
  if (!pca) {
    return res.status(503).json({ error: 'Outlook Calendar integration is not configured' });
  }
  try {
    if (!req.session.outlookTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { summary, start, end, description, location } = req.body;
    const graphClient = getGraphClient(req.session.outlookTokens.accessToken);

    const event = {
      subject: summary,
      start: {
        dateTime: start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: end,
        timeZone: 'UTC'
      },
      body: {
        contentType: 'HTML',
        content: description || ''
      },
      location: location ? {
        displayName: location
      } : undefined
    };

    const createdEvent = await graphClient
      .api('/me/calendar/events')
      .post(event);

    res.json({
      success: true,
      event: {
        id: createdEvent.id,
        summary: createdEvent.subject,
        start: createdEvent.start.dateTime,
        end: createdEvent.end.dateTime,
        source: 'outlook'
      }
    });
  } catch (error) {
    console.error('Error creating Outlook Calendar event:', error);
    res.status(500).json({ error: 'Failed to create Outlook Calendar event' });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.session.outlookTokens = null;
  req.session.outlookUser = null;
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

