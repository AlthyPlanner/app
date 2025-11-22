require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// Configure session store - use Redis in production if available, otherwise MemoryStore
let sessionStore;
if (process.env.REDIS_URL) {
  // Use Redis for production (scalable, persistent)
  try {
    const RedisStore = require('connect-redis');
    const { createClient } = require('redis');
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return false; // Stop retrying
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });
    
    // Connect Redis asynchronously (non-blocking)
    redisClient.connect().catch((err) => {
      console.error('Redis connection error (will continue with Redis store, connection will retry):', err.message);
    });
    
    // Create Redis store (connection can be pending)
    sessionStore = new RedisStore({ client: redisClient });
    console.log('Using Redis session store');
  } catch (error) {
    console.error('Failed to initialize Redis store, falling back to MemoryStore:', error.message);
    // Fallback to MemoryStore if Redis initialization fails
    const MemoryStore = require('memorystore')(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
    console.log('Using MemoryStore session store (Redis initialization failed)');
  }
} else {
  // Use MemoryStore for single-instance deployments (development or small scale)
  const MemoryStore = require('memorystore')(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
  if (process.env.NODE_ENV === 'production') {
    console.warn('Warning: Using MemoryStore in production. Consider adding Redis for scalability.');
  } else {
    console.log('Using MemoryStore session store');
  }
}

// Import routes
const todoRoutes = require('./routes/todoRoutes');
const typeRoutes = require('./routes/typeRoutes');
const googleRoutes = require('./routes/googleRoutes');
const outlookRoutes = require('./routes/outlookRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3001",
  credentials: true
}));

// Needed for cookies over cross-origin redirects (OAuth)
app.set("trust proxy", 1);

// Session configuration
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // true for HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());


// Routes
app.use('/api/todos', todoRoutes);

// Mount chat routes (handles actions + AI responses)
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
  const chatRoutes = require('./routes/chatRoutes');
  app.use('/api/chat', chatRoutes);
  // Keep /api/openai for backward compatibility
  app.use('/api/openai', chatRoutes);
} else {
  // Provide a helpful error message if OpenAI is not configured
  const errorHandler = (req, res) => {
    res.status(503).json({ 
      error: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.' 
    });
  };
  app.post('/api/chat', errorHandler);
  app.post('/api/openai', errorHandler);
}

app.use('/api/types', typeRoutes);
app.use('/api/google', googleRoutes);
// Mount Outlook routes only if credentials are present
if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) {
  app.use('/api/outlook', outlookRoutes);
}
app.use('/api/calendar', calendarRoutes);
app.use('/api/emails', emailRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to Todo Planner API!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS origin: ${process.env.CLIENT_URL || 'http://localhost:3001'}`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please kill the process using that port.`);
    }
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
