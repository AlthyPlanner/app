require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { initializeDatabase } = require('./db/migrations');

console.log('🚀 Starting server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || '5001 (default)');

// Initialize database
if (process.env.DATABASE_URL) {
  console.log('🗄️  Initializing database...');
  initializeDatabase().catch((error) => {
    console.error('❌ Database initialization failed:', error);
    // Continue anyway - database might be set up manually
  });
} else {
  console.warn('⚠️  No DATABASE_URL found. Database features will not work.');
}

// Configure session store - using MemoryStore (works great for single-instance deployments)
// Note: If you need to scale to multiple instances later, you can add Redis or PostgreSQL session store
console.log('💾 Configuring session store...');
const MemoryStore = require('memorystore')(session);
const sessionStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});
console.log('✅ Using MemoryStore session store');

console.log('📦 Loading routes...');
// Import routes
const todoRoutes = require('./routes/todoRoutes');
const typeRoutes = require('./routes/typeRoutes');
const goalRoutes = require('./routes/goalRoutes');
const googleRoutes = require('./routes/googleRoutes');
const outlookRoutes = require('./routes/outlookRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const emailRoutes = require('./routes/emailRoutes');

console.log('✅ Routes loaded successfully');

const app = express();
const PORT = process.env.PORT || 5001;

console.log('⚙️  Configuring middleware...');

// Middleware
app.use(express.json());

// CORS configuration - allow multiple origins for development and production
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ["http://localhost:3001", "http://localhost:3000", "https://www.althyplanner.com", "https://althyplanner.com"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, allow localhost on any port
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use('/api/goals', goalRoutes);

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

console.log('🌐 Starting HTTP server...');
// Start server
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅✅✅ Server successfully started on port ${PORT} ✅✅✅`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS origin: ${process.env.CLIENT_URL || 'http://localhost:3001'}`);
    console.log(`Health check: http://0.0.0.0:${PORT}/health`);
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
