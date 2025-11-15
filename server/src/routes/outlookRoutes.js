const express = require('express');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
const router = express.Router();

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.OUTLOOK_CLIENT_ID,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    authority: 'https://login.microsoftonline.com/common'
  }
};

const pca = new ConfidentialClientApplication(msalConfig);

// Helper function to get Microsoft Graph client
function getGraphClient(accessToken) {
  // Create an authentication provider
  const authProvider = {
    getAccessToken: async () => {
      return accessToken;
    }
  };
  
  // Initialize the Graph client
  return Client.init({
    authProvider: authProvider
  });
}

// Initiate OAuth flow
router.get('/auth/microsoft', async (req, res) => {
  try {
    const authCodeUrlParameters = {
      scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:5001/api/outlook/auth/microsoft/callback'
    };

    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Outlook auth:', error);
    res.redirect(`http://localhost:3001/app/profile?error=outlook_auth_failed`);
  }
});

// OAuth callback
router.get('/auth/microsoft/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('http://localhost:3001/app/profile?error=outlook_auth_failed');
    }

    const tokenRequest = {
      code: code,
      scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite'],
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:5001/api/outlook/auth/microsoft/callback'
    };

    const response = await pca.acquireTokenByCode(tokenRequest);
    
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

    res.redirect('http://localhost:3001/app/profile?outlook_auth=success');
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

