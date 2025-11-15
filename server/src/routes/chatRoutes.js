const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Test endpoint
router.get('/', (req, res) => {
  res.json({ message: 'Chat endpoint is working', timestamp: new Date().toISOString() });
});

// Simple test POST endpoint
router.post('/test', (req, res) => {
  res.json({ message: 'POST test endpoint works', body: req.body });
});

// Handle chat with action processing (tasks/events) and AI response
router.post('/', async (req, res) => {
  console.log('=== Chat POST request received ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request body exists:', !!req.body);
  console.log('Request body type:', typeof req.body);
  console.log('Content-Type:', req.headers['content-type']);
  
  // Immediate response test - if this doesn't work, the route isn't being hit
  if (!req.body) {
    console.error('No request body!');
    return res.status(400).json({ error: 'Request body is required' });
  }
  
  // Set a timeout to ensure we always respond
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Request timeout - sending error response');
      try {
        res.status(500).json({ error: 'Request timeout' });
      } catch (e) {
        console.error('Failed to send timeout response:', e);
      }
    }
  }, 30000); // 30 second timeout
  
  try {
    console.log('Calling chatController.handleChat...');
    await chatController.handleChat(req, res);
    console.log('chatController.handleChat completed');
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    console.error('=== Unhandled error in route handler ===');
    console.error('Error message:', err.message);
    console.error('Error name:', err.name);
    console.error('Error stack:', err.stack);
    
    if (!res.headersSent) {
      try {
        res.status(500).json({ 
          error: 'Internal server error: ' + (err.message || 'Unknown error')
        });
      } catch (responseErr) {
        console.error('Failed to send error response:', responseErr);
      }
    } else {
      console.error('Response already sent, cannot send error');
    }
  }
});

module.exports = router; 