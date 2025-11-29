const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, accessCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate access code
    if (!accessCode || accessCode !== 'appaccess') {
      return res.status(403).json({ error: 'Invalid access code' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user (without name - will be collected in onboarding)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, name, timezone, chronotype, planning_style, google_access_token, google_refresh_token, google_profile, created_at`,
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];

    // Log in the user by setting session
    req.login({ id: user.id, email: user.email, name: user.name }, (err) => {
      if (err) {
        console.error('Registration login session error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      // Load Google tokens from database if they exist (for new users, this will be null)
      if (user.google_access_token) {
        req.session.googleTokens = {
          accessToken: user.google_access_token,
          refreshToken: user.google_refresh_token,
          profile: user.google_profile || null
        };
      }
      
      // Ensure session is saved
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Registration session save error:', saveErr);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        
        console.log('User registered and logged in successfully:', { userId: user.id, email: user.email, sessionId: req.sessionID });
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            chronotype: user.chronotype,
            planning_style: user.planning_style,
            wake_time: user.wake_time,
            sleep_time: user.sleep_time
          }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email (including Google tokens)
    const result = await pool.query(
      'SELECT id, email, password_hash, name, timezone, chronotype, planning_style, wake_time, sleep_time, google_access_token, google_refresh_token, google_profile FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Log in the user by setting session
    req.login({ id: user.id, email: user.email, name: user.name }, (err) => {
      if (err) {
        console.error('Login session error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      // Load Google tokens from database and store in session
      if (user.google_access_token) {
        req.session.googleTokens = {
          accessToken: user.google_access_token,
          refreshToken: user.google_refresh_token,
          profile: user.google_profile || null
        };
        console.log('Loaded Google tokens from database for user:', user.id);
      }
      
      // Ensure session is saved
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Login session save error:', saveErr);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        
        console.log('User logged in successfully:', { userId: user.id, email: user.email, sessionId: req.sessionID, hasGoogleTokens: !!user.google_access_token });
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            timezone: user.timezone,
            chronotype: user.chronotype,
            planning_style: user.planning_style,
            wake_time: user.wake_time,
            sleep_time: user.sleep_time
          }
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      res.json({ success: true });
    });
  });
});

// Update onboarding data
router.post('/onboarding', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, chronotype, wake_time, sleep_time, planning_style } = req.body;

    if (!name || !chronotype || !wake_time || !sleep_time || !planning_style) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate planning_style
    const validPlanningStyles = ['structured', 'relaxed', 'flexible'];
    if (!validPlanningStyles.includes(planning_style)) {
      return res.status(400).json({ error: 'Invalid planning style. Must be one of: structured, relaxed, flexible' });
    }

    // Update user
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, chronotype = $2, wake_time = $3, sleep_time = $4, planning_style = $5
       WHERE id = $6
       RETURNING id, email, name, timezone, chronotype, planning_style, wake_time, sleep_time, created_at`,
      [name.trim(), chronotype, wake_time, sleep_time, planning_style, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        chronotype: user.chronotype,
        planning_style: user.planning_style,
        wake_time: user.wake_time,
        sleep_time: user.sleep_time
      }
    });
  } catch (error) {
    console.error('Onboarding update error:', error);
    res.status(500).json({ error: 'Failed to update onboarding data' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    sessionId: req.sessionID,
    session: req.session
  });
  
  if (req.isAuthenticated() && req.user) {
    // Fetch fresh user data from database
    pool.query(
      'SELECT id, email, name, timezone, chronotype, planning_style, wake_time, sleep_time, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
      .then(result => {
        if (result.rows.length > 0) {
          res.json({ user: result.rows[0] });
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
      });
  } else {
    console.log('Not authenticated - returning 401');
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;

