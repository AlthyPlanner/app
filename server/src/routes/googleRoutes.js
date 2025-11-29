const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const pool = require('../db/connection');
const router = express.Router();

// Helper function to get Google tokens (from database or session)
async function getGoogleTokens(req) {
  // First check if app user is authenticated
  if (!req.user || !req.user.id) {
    return null;
  }
  
  // Try to get from session first (faster)
  if (req.session.googleTokens && req.session.googleTokens.accessToken) {
    return req.session.googleTokens;
  }
  
  // If not in session, load from database
  try {
    const result = await pool.query(
      'SELECT google_access_token, google_refresh_token, google_profile FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length > 0 && result.rows[0].google_access_token) {
      const tokens = {
        accessToken: result.rows[0].google_access_token,
        refreshToken: result.rows[0].google_refresh_token,
        profile: result.rows[0].google_profile || null
      };
      
      // Store in session for future requests
      req.session.googleTokens = tokens;
      return tokens;
    }
  } catch (error) {
    console.error('Error loading Google tokens from database:', error);
  }
  
  return null;
}

// Configure Passport Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // IMPORTANT: Google should redirect back to the backend, not the frontend
    // Full callback path = /api/google/auth/google/callback
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 
      (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/google/auth/google/callback` : null) ||
      "http://localhost:5001/api/google/auth/google/callback",
    accessType: 'offline',
    prompt: 'consent'
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
    console.error('Google OAuth strategy error:', error);
    return done(error, null);
  }
  }));
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google Calendar features will not be available.');
}

// Note: Passport serialize/deserialize are now configured in config/passport.js
// This ensures they're set up before any routes that use req.login()

// Google OAuth routes (only available if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      accessType: 'offline',
      prompt: 'consent'
    })
  );
} else {
  router.get('/auth/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  });
}

// Google OAuth callback (only available if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/auth/google/callback', (req, res, next) => {
    console.log('OAuth callback route hit:', {
      query: req.query,
      params: req.params,
      url: req.url,
      method: req.method,
      appUser: req.user ? { id: req.user.id, email: req.user.email } : null
    });
    next();
  },
  async (req, res, next) => {
    passport.authenticate('google', async (err, googleTokens, info) => {
      console.log('Passport authenticate result:', {
        hasError: !!err,
        error: err?.message,
        hasTokens: !!googleTokens,
        googleEmail: googleTokens?.profile?.email,
        appUser: req.user ? { id: req.user.id, email: req.user.email } : null,
        info: info
      });
      
      if (err) {
        console.error('Passport authentication error:', err);
        const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
        return res.redirect(`${frontendUrl}/app/profile?error=auth_failed`);
      }
      
      if (!googleTokens) {
        console.error('Passport authentication failed: no tokens');
        const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
        return res.redirect(`${frontendUrl}/app/profile?error=auth_failed`);
      }
      
      // Check if app user is authenticated - tokens should be associated with app user
      if (!req.user || !req.user.id) {
        console.error('Cannot store Google tokens: app user not authenticated');
        const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
        return res.redirect(`${frontendUrl}/app/profile?error=app_not_authenticated`);
      }
      
      // Store Google tokens in database (persistent) AND session (for immediate use)
      const pool = require('../db/connection');
      try {
        await pool.query(
          `UPDATE users 
           SET google_access_token = $1, 
               google_refresh_token = $2, 
               google_profile = $3
           WHERE id = $4`,
          [
            googleTokens.accessToken,
            googleTokens.refreshToken,
            JSON.stringify(googleTokens.profile),
            req.user.id
          ]
        );
        
        // Also store in session for immediate use
        req.session.googleTokens = {
          accessToken: googleTokens.accessToken,
          refreshToken: googleTokens.refreshToken,
          profile: googleTokens.profile
        };
        
        console.log('Google tokens saved to database and session for user:', {
          appUserId: req.user.id,
          googleEmail: googleTokens.profile.email,
          sessionId: req.sessionID
        });
      } catch (dbError) {
        console.error('Error saving Google tokens to database:', dbError);
        const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
        return res.redirect(`${frontendUrl}/app/profile?error=token_save_failed`);
      }
      
      // Save session and proceed
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Error saving Google tokens to session:', saveErr);
          const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
          return res.redirect(`${frontendUrl}/app/profile?error=auth_failed`);
        }
        next();
      });
    })(req, res, next);
  },
  async (req, res) => {
    // Successful Google OAuth - now sync events to database if user is authenticated
    try {
      // Check if app user is authenticated and get Google tokens
      const googleTokens = await getGoogleTokens(req);
      if (req.user && req.user.id && googleTokens) {
        console.log('Syncing Google Calendar events for user:', req.user.id);
        
        // Sync Google events (to database or file-based calendar)
        const { google } = require('googleapis');
        
        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 
          (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/google/auth/google/callback` : null) ||
          "http://localhost:5001/api/google/auth/google/callback";
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl
        );

        oauth2Client.setCredentials({
          access_token: googleTokens.accessToken,
          refresh_token: googleTokens.refreshToken
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

        const googleEvents = response.data.items || [];
        
        // Try to sync to database first, fallback to file-based calendar
        const Event = require('../models/Event');
        const Calendar = require('../models/Calendar');
        let useDatabase = false;
        
        // Check if database is available
        try {
          // Test database connection
          await Event.getAll(req.user.id);
          useDatabase = true;
        } catch (dbCheckError) {
          console.log('Database not available, using file-based calendar for Google events');
          useDatabase = false;
        }
        
        if (useDatabase) {
          // Sync each Google event to database (optimized with direct queries)
          let syncedCount = 0;
          for (const googleEvent of googleEvents) {
            try {
              const eventData = {
                summary: googleEvent.summary || 'No Title',
                start: googleEvent.start.dateTime || googleEvent.start.date,
                end: googleEvent.end.dateTime || googleEvent.end.date,
                description: googleEvent.description || '',
                location: googleEvent.location || '',
                source: 'google',
                external_event_id: googleEvent.id,
                category: 'work' // Default category, can be categorized later
              };
              
              // Optimized: Check if event exists using direct query (uses index)
              const existingEventId = await Event.existsByExternalId(req.user.id, googleEvent.id);
              
              if (!existingEventId) {
                await Event.create(req.user.id, eventData);
                syncedCount++;
                console.log(`Synced Google event to database: ${eventData.summary}`);
              }
            } catch (eventError) {
              console.error(`Error syncing individual Google event:`, eventError);
              // Continue with other events
            }
          }
          console.log(`Successfully synced ${syncedCount} new Google Calendar events to database (${googleEvents.length} total checked)`);
        } else {
          // Fallback to file-based calendar
          const formattedEvents = googleEvents.map(event => ({
            id: event.id,
            summary: event.summary || 'No Title',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            description: event.description || '',
            location: event.location || '',
            source: 'google'
          }));
          
          // Use Calendar model's syncGoogleEvents method
          await Calendar.syncGoogleEvents(formattedEvents);
          console.log(`Successfully synced ${googleEvents.length} Google Calendar events to file-based calendar`);
        }
      }
    } catch (syncError) {
      console.error('Error syncing Google events to database:', syncError);
      // Don't fail the OAuth flow if sync fails
    }
    
    // Redirect to frontend with success
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:3001";
    res.redirect(`${frontendUrl}/app/profile?auth=success`);
  }
  );
} else {
  router.get('/auth/google/callback', (req, res) => {
    res.status(503).json({ error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  });
}

// Check authentication status
router.get('/auth/status', async (req, res) => {
  // Check if Google tokens exist (in database or session)
  const googleTokens = await getGoogleTokens(req);
  
  console.log('Google auth status check:', {
    hasGoogleTokens: !!googleTokens,
    googleEmail: googleTokens?.profile?.email,
    appUser: req.user ? { id: req.user.id, email: req.user.email } : null,
    sessionID: req.sessionID
  });
  
  if (googleTokens) {
    res.json({ 
      authorized: true, 
      user: googleTokens.profile,
      hasTokens: true
    });
  } else {
    res.json({ authorized: false });
  }
});

// Get Google Calendar events and sync to database
router.get('/events', async (req, res) => {
  try {
    // Check if app user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'App user not authenticated' });
    }

    // Get Google tokens (from database or session)
    const googleTokens = await getGoogleTokens(req);
    if (!googleTokens || !googleTokens.accessToken) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 
      (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/google/auth/google/callback` : null) ||
      "http://localhost:5001/api/google/auth/google/callback";
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    );

    oauth2Client.setCredentials({
      access_token: googleTokens.accessToken,
      refresh_token: googleTokens.refreshToken
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

    const googleEvents = response.data.items || [];
    const Event = require('../models/Event');
    const Calendar = require('../models/Calendar');
    
    // Check if database is available
    let useDatabase = false;
    try {
      await Event.getAll(req.user.id);
      useDatabase = true;
    } catch (dbCheckError) {
      console.log('Database not available, using file-based calendar for Google events');
      useDatabase = false;
    }
    
    if (useDatabase) {
      // Sync Google events to database (optimized with direct queries)
      const syncedCount = { added: 0, updated: 0 };
      
      for (const googleEvent of googleEvents) {
        try {
          const eventData = {
            summary: googleEvent.summary || 'No Title',
            start: googleEvent.start.dateTime || googleEvent.start.date,
            end: googleEvent.end.dateTime || googleEvent.end.date,
            description: googleEvent.description || '',
            location: googleEvent.location || '',
            source: 'google',
            external_event_id: googleEvent.id,
            category: null // Will be categorized by the categorization service
          };
          
          // Optimized: Check if event exists using direct query (uses index)
          const existingEventId = await Event.existsByExternalId(req.user.id, googleEvent.id);
          
          if (existingEventId) {
            // Update existing event
            await Event.update(existingEventId, req.user.id, eventData);
            syncedCount.updated++;
          } else {
            // Create new event
            await Event.create(req.user.id, eventData);
            syncedCount.added++;
          }
        } catch (eventError) {
          console.error(`Error syncing Google event ${googleEvent.id}:`, eventError);
          // Continue with other events
        }
      }
      
      console.log(`Synced Google Calendar events: ${syncedCount.added} added, ${syncedCount.updated} updated`);
      
      // Return all user events from database (including Google events)
      const allEvents = await Event.getAll(req.user.id);
      res.json({ events: allEvents });
    } else {
      // Fallback to file-based calendar
      const formattedEvents = googleEvents.map(event => ({
        id: event.id,
        summary: event.summary || 'No Title',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        description: event.description || '',
        location: event.location || '',
        source: 'google'
      }));
      
      // Sync to file-based calendar
      const syncedEvents = await Calendar.syncGoogleEvents(formattedEvents);
      const categorizedEvents = await Calendar.categorizeEvents(syncedEvents, true);
      
      console.log(`Synced ${googleEvents.length} Google Calendar events to file-based calendar`);
      res.json({ events: categorizedEvents });
    }
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
});

// Create event in Google Calendar
router.post('/events', async (req, res) => {
  try {
    // Check if app user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'App user not authenticated' });
    }

    // Get Google tokens (from database or session)
    const googleTokens = await getGoogleTokens(req);
    if (!googleTokens || !googleTokens.accessToken) {
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }

    const { summary, start, end, description, location } = req.body;

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 
      (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/google/auth/google/callback` : null) ||
      "http://localhost:5001/api/google/auth/google/callback";
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    );

    oauth2Client.setCredentials({
      access_token: googleTokens.accessToken,
      refresh_token: googleTokens.refreshToken
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

// Disconnect Google Calendar
router.post('/auth/logout', async (req, res) => {
  try {
    // Check if app user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'App user not authenticated' });
    }

    const Event = require('../models/Event');
    
    // Remove Google Calendar events from database
    try {
      const allEvents = await Event.getAll(req.user.id);
      const googleEvents = allEvents.filter(e => e.source === 'google');
      
      for (const event of googleEvents) {
        try {
          await Event.delete(event.id, req.user.id);
        } catch (deleteError) {
          console.error(`Error deleting Google event ${event.id}:`, deleteError);
        }
      }
      
      console.log(`Removed ${googleEvents.length} Google Calendar events from database`);
    } catch (dbError) {
      console.error('Error removing Google events from database:', dbError);
      // Continue to remove tokens even if event removal fails
    }
    
    // Remove Google tokens from database (this is the persistent storage)
    try {
      await pool.query(
        `UPDATE users 
         SET google_access_token = NULL, 
             google_refresh_token = NULL, 
             google_profile = NULL
         WHERE id = $1`,
        [req.user.id]
      );
      console.log('Google tokens removed from database for user:', req.user.id);
    } catch (dbError) {
      console.error('Error removing Google tokens from database:', dbError);
      return res.status(500).json({ error: 'Failed to remove Google tokens from database' });
    }
    
    // Clear Google tokens from session
    delete req.session.googleTokens;
    
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Error saving session after Google disconnect:', saveErr);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({ 
        success: true, 
        message: 'Google Calendar disconnected successfully'
      });
    });
  } catch (error) {
    console.error('Error during Google Calendar disconnect:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

module.exports = router;