const express = require('express');
const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const router = express.Router();

// Helper to get user_id from session
const getUserId = (req) => {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
};

// Events - use PostgreSQL Event model for authenticated users
router.get('/events', async (req, res) => {
  try {
    // Log authentication status for debugging
    console.log('Calendar events request:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id,
      sessionId: req.sessionID,
      hasSession: !!req.session
    });
    
    // If user is authenticated, use PostgreSQL
    if (req.user && req.user.id) {
      try {
        // Optional: Support date range filtering via query params for better performance
        const { start, end } = req.query;
        
        let events;
        if (start && end) {
          // Use optimized date range query if dates provided
          events = await Event.getByDateRange(req.user.id, new Date(start), new Date(end));
        } else {
          // Get all events (still optimized with indexes)
          events = await Event.getAll(req.user.id);
        }
        
        console.log(`✅ Loaded ${events.length} events from database for user ${req.user.id}`);
        res.json({ events });
      } catch (dbError) {
        console.error('Database error fetching events:', dbError);
        console.error('Database error stack:', dbError.stack);
        // Fallback to file-based Calendar if database fails
        console.log('Falling back to file-based calendar');
        const events = await Calendar.listEvents();
        res.json({ events });
      }
    } else {
      // Fallback to file-based Calendar for backward compatibility
      console.log('⚠️  User not authenticated, using file-based calendar');
      const events = await Calendar.listEvents();
      res.json({ events });
    }
  } catch (e) {
    console.error('Error fetching events:', e);
    console.error('Error stack:', e.stack);
    // Return empty array instead of 500 error
    res.json({ events: [] });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { summary, start, end, category, location, description, goal_id, is_all_day, source, external_event_id } = req.body;
    if (!summary || !start || !end) return res.status(400).json({ error: 'summary, start, end required' });
    
    // If user is authenticated, use PostgreSQL
    if (req.user && req.user.id) {
      const evt = await Event.create(req.user.id, { 
        summary, start, end, category, location, description, goal_id, is_all_day, source, external_event_id 
      });
      res.json({ event: evt });
    } else {
      // Fallback to file-based Calendar
      const evt = await Calendar.createEvent({ summary, start, end, category });
      res.json({ event: evt });
    }
  } catch (e) {
    if (e.message === 'User not authenticated') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.error('Error creating event:', e);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // If user is authenticated, use PostgreSQL
    if (req.user && req.user.id) {
      const updated = await Event.update(parseInt(id), req.user.id, req.body || {});
      res.json({ event: updated });
    } else {
      // Fallback to file-based Calendar
      const updated = await Calendar.updateEvent(id, req.body || {});
      res.json({ event: updated });
    }
  } catch (e) {
    if (e.message === 'User not authenticated') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (e.message === 'Event not found') return res.status(404).json({ error: 'Not found' });
    console.error('Error updating event:', e);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // If user is authenticated, use PostgreSQL
    if (req.user && req.user.id) {
      const r = await Event.delete(parseInt(id), req.user.id);
      res.json(r);
    } else {
      // Fallback to file-based Calendar
      const r = await Calendar.deleteEvent(id);
      res.json(r);
    }
  } catch (e) {
    if (e.message === 'User not authenticated') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (e.message === 'Event not found') return res.status(404).json({ error: 'Not found' });
    console.error('Error deleting event:', e);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Calendar.listCategories();
    res.json({ categories });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read categories' });
  }
});

router.put('/categories', async (req, res) => {
  try {
    const categories = Array.isArray(req.body) ? req.body : [];
    const saved = await Calendar.saveCategories(categories);
    res.json({ categories: saved });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save categories' });
  }
});

// Shared Calendars
router.get('/shared', async (req, res) => {
  try {
    const sharedCalendars = await Calendar.listSharedCalendars();
    res.json({ sharedCalendars });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read shared calendars' });
  }
});

router.post('/shared', async (req, res) => {
  try {
    const { name, email, userId, color } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const calendar = await Calendar.addSharedCalendar({ name, email, userId, color });
    res.json({ calendar });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add shared calendar' });
  }
});

router.delete('/shared/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await Calendar.removeSharedCalendar(id);
    res.json(r);
  } catch (e) {
    if (e.message === 'Shared calendar not found') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Failed to remove shared calendar' });
  }
});

module.exports = router;


