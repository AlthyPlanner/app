const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const router = express.Router();

// Configure Passport Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // IMPORTANT: Google should redirect back to the backend, not the frontend
  // Full callback path = /api/google/auth/google/callback
  callbackURL: "http://localhost:5001/api/google/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Store tokens for this user session
    const userTokens = {
      accessToken,
      refreshToken,
      profile: {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value
      }
    };
    
    return done(null, userTokens);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth routes
router.get('/auth/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'] 
  })
);

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:3001/calendar?error=auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to frontend calendar with success
    res.redirect('http://localhost:3001/calendar?auth=success');
  }
);

// Check authentication status
router.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      authorized: true, 
      user: req.user.profile,
      hasTokens: !!req.user.accessToken 
    });
  } else {
    res.json({ authorized: false });
  }
});

// Get Google Calendar events
router.get('/events', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3001/auth/google/callback"
    );

    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get events for the next 30 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items.map(event => ({
      id: event.id,
      summary: event.summary || 'No Title',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      description: event.description || '',
      location: event.location || '',
      source: 'google'
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
});

// Create event in Google Calendar
router.post('/events', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { summary, start, end, description, location } = req.body;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3001/auth/google/callback"
    );

    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary,
      start: {
        dateTime: start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: end,
        timeZone: 'UTC',
      },
      description: description || '',
      location: location || '',
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json({ 
      success: true, 
      event: {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start.dateTime,
        end: response.data.end.dateTime,
        source: 'google'
      }
    });
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    res.status(500).json({ error: 'Failed to create Google Calendar event' });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;