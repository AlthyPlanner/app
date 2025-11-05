const express = require('express');
const Calendar = require('../models/Calendar');
const router = express.Router();

// Events
router.get('/events', async (req, res) => {
  try {
    const events = await Calendar.listEvents();
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read events' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { summary, start, end, category } = req.body;
    if (!summary || !start || !end) return res.status(400).json({ error: 'summary, start, end required' });
    const evt = await Calendar.createEvent({ summary, start, end, category });
    res.json({ event: evt });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Calendar.updateEvent(id, req.body || {});
    res.json({ event: updated });
  } catch (e) {
    if (e.message === 'Event not found') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await Calendar.deleteEvent(id);
    res.json(r);
  } catch (e) {
    if (e.message === 'Event not found') return res.status(404).json({ error: 'Not found' });
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

module.exports = router;


