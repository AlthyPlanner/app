const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/connection');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, accessCode } = req.body;

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

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, timezone, chronotype, planning_style, google_access_token, google_refresh_token, google_profile, created_at`,
      [email.toLowerCase().trim(), passwordHash, name || null]
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
            planning_style: user.planning_style
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
      'SELECT id, email, password_hash, name, timezone, chronotype, planning_style, google_access_token, google_refresh_token, google_profile FROM users WHERE email = $1',
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
            planning_style: user.planning_style
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
      'SELECT id, email, name, timezone, chronotype, planning_style, created_at FROM users WHERE id = $1',
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

