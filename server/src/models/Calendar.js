const fs = require('fs').promises;
const path = require('path');
const { categorizeEvent } = require('../services/eventCategorizationService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'calendarCategories.json');
const SHARED_CALENDARS_FILE = path.join(DATA_DIR, 'sharedCalendars.json');

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(EVENTS_FILE); } catch (e) { await fs.writeFile(EVENTS_FILE, JSON.stringify([], null, 2)); }
  try { await fs.access(CATEGORIES_FILE); } catch (e) {
    const defaults = [
      { key: 'work', label: 'Work', color: '#1976d2' },
      { key: 'study', label: 'Study', color: '#8e24aa' },
      { key: 'fitness', label: 'Fitness', color: '#2e7d32' },
      { key: 'leisure', label: 'Leisure', color: '#ef6c00' }
    ];
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(defaults, null, 2));
  }
  try { await fs.access(SHARED_CALENDARS_FILE); } catch (e) { await fs.writeFile(SHARED_CALENDARS_FILE, JSON.stringify([], null, 2)); }
}

async function readJson(file) {
  await ensureFiles();
  const content = await fs.readFile(file, 'utf8');
  return content.trim() ? JSON.parse(content) : [];
}

async function writeJson(file, data) {
  await ensureFiles();
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

class CalendarModel {
  static async listEvents() {
    // Load events and ensure they all have categories
    return await this.categorizeEvents();
  }

  static async createEvent(evt) {
    const events = await this.listEvents();
    
    // Categorize event if category is not provided
    let category = evt.category;
    if (!category) {
      category = await categorizeEvent(
        evt.summary || '',
        evt.description || '',
        evt.location || ''
      );
    }
    
    const newEvt = {
      id: generateId(),
      summary: (evt.summary || '').trim(),
      start: evt.start,
      end: evt.end,
      description: evt.description || '',
      location: evt.location || '',
      category: category
    };
    events.push(newEvt);
    await writeJson(EVENTS_FILE, events);
    return newEvt;
  }

  static async updateEvent(id, evt) {
    const events = await this.listEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Event not found');
    events[idx] = { ...events[idx], ...evt, summary: (evt.summary ?? events[idx].summary).trim?.() ?? events[idx].summary };
    await writeJson(EVENTS_FILE, events);
    return events[idx];
  }

  static async deleteEvent(id) {
    const events = await this.listEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Event not found');
    events.splice(idx, 1);
    await writeJson(EVENTS_FILE, events);
    return { message: 'Deleted' };
  }

  static async listCategories() {
    return await readJson(CATEGORIES_FILE);
  }

  static async saveCategories(categories) {
    await writeJson(CATEGORIES_FILE, categories);
    return categories;
  }

  static async listSharedCalendars() {
    return await readJson(SHARED_CALENDARS_FILE);
  }

  static async addSharedCalendar(calendar) {
    const sharedCalendars = await this.listSharedCalendars();
    const newCalendar = {
      id: generateId(),
      name: calendar.name || '',
      email: calendar.email || '',
      userId: calendar.userId || '',
      color: calendar.color || '#3b82f6',
      createdAt: new Date().toISOString()
    };
    sharedCalendars.push(newCalendar);
    await writeJson(SHARED_CALENDARS_FILE, sharedCalendars);
    return newCalendar;
  }

  static async removeSharedCalendar(id) {
    const sharedCalendars = await this.listSharedCalendars();
    const idx = sharedCalendars.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Shared calendar not found');
    sharedCalendars.splice(idx, 1);
    await writeJson(SHARED_CALENDARS_FILE, sharedCalendars);
    return { message: 'Removed' };
  }

  /**
   * Sync Google Calendar events into the events.json file
   * This merges Google events with existing events, avoiding duplicates
   * Does NOT categorize events - that's handled separately
   * @param {Array} googleEvents - Array of events from Google Calendar
   * @returns {Array} - Merged events array (without categorization)
   */
  static async syncGoogleEvents(googleEvents) {
    const existingEvents = await readJson(EVENTS_FILE);
    
    // Create a map of existing events by their Google ID or source+id
    const existingMap = new Map();
    existingEvents.forEach(event => {
      if (event.source === 'google' && event.googleId) {
        existingMap.set(`google_${event.googleId}`, event);
      } else if (!event.source || event.source === 'local') {
        // Local events use their own id
        existingMap.set(`local_${event.id}`, event);
      }
    });

    // Process Google events - only sync, no categorization
    for (const googleEvent of googleEvents) {
      const key = `google_${googleEvent.id}`;
      
      if (existingMap.has(key)) {
        // Update existing Google event (in case it changed)
        const existing = existingMap.get(key);
        
        existingMap.set(key, {
          ...existing,
          summary: googleEvent.summary || existing.summary,
          start: googleEvent.start || existing.start,
          end: googleEvent.end || existing.end,
          description: googleEvent.description || existing.description,
          location: googleEvent.location || existing.location,
          source: 'google',
          googleId: googleEvent.id,
          // Preserve existing category if it exists
          category: existing.category || null
        });
      } else {
        // Add new Google event (without category - will be categorized separately)
        existingMap.set(key, {
          id: generateId(), // Generate local ID
          googleId: googleEvent.id, // Keep Google ID for reference
          summary: googleEvent.summary || 'No Title',
          start: googleEvent.start,
          end: googleEvent.end,
          description: googleEvent.description || '',
          location: googleEvent.location || '',
          source: 'google',
          category: null // Will be categorized separately
        });
      }
    }

    // Convert map back to array
    const mergedEvents = Array.from(existingMap.values());
    
    // Save merged events to file
    await writeJson(EVENTS_FILE, mergedEvents);
    
    return mergedEvents;
  }

  /**
   * Categorize events that don't have categories
   * @param {Array} events - Optional array of events to categorize. If not provided, categorizes all events in events.json
   * @param {boolean} saveToFile - Whether to save categorized events back to file (default: true if events not provided, false if events provided)
   * @returns {Array} - Events with categories assigned
   */
  static async categorizeEvents(events = null, saveToFile = null) {
    const eventsToCategorize = events || await readJson(EVENTS_FILE);
    const shouldSave = saveToFile !== null ? saveToFile : (events === null);
    let needsUpdate = false;

    // Categorize events that don't have categories
    for (const event of eventsToCategorize) {
      if (!event.category) {
        event.category = await categorizeEvent(
          event.summary || '',
          event.description || '',
          event.location || ''
        );
        needsUpdate = true;
      }
    }

    // Save updated events if any were categorized and save is requested
    if (needsUpdate && shouldSave) {
      await writeJson(EVENTS_FILE, eventsToCategorize);
    }

    return eventsToCategorize;
  }

  /**
   * Remove all Google Calendar events from events.json
   * Called when user disconnects from Google Calendar
   * @returns {number} - Number of events removed
   */
  static async removeGoogleEvents() {
    const events = await readJson(EVENTS_FILE);
    
    // Filter out Google events
    const filteredEvents = events.filter(event => event.source !== 'google');
    const removedCount = events.length - filteredEvents.length;
    
    // Save filtered events back to file
    if (removedCount > 0) {
      await writeJson(EVENTS_FILE, filteredEvents);
    }
    
    return removedCount;
  }
}

module.exports = CalendarModel;


