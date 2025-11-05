require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

// Import routes
const todoRoutes = require('./routes/todoRoutes');
const typeRoutes = require('./routes/typeRoutes');
const googleRoutes = require('./routes/googleRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/todos', todoRoutes);

// Mount OpenAI routes only if API key is present
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
  const openaiRoutes = require('./routes/openaiRoutes');
  app.use('/api/openai', openaiRoutes);
}

app.use('/api/types', typeRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/calendar', calendarRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to Todo Planner API!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
