require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// Import routes
const todoRoutes = require('./routes/todoRoutes');
const typeRoutes = require('./routes/typeRoutes');
const googleRoutes = require('./routes/googleRoutes');
const outlookRoutes = require('./routes/outlookRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the process using that port.`);
  }
});
