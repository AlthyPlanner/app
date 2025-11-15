const fs = require('fs').promises;
const path = require('path');

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
    return await readJson(EVENTS_FILE);
  }

  static async createEvent(evt) {
    const events = await this.listEvents();
    const newEvt = {
      id: generateId(),
      summary: (evt.summary || '').trim(),
      start: evt.start,
      end: evt.end,
      category: evt.category || 'work'
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
}

module.exports = CalendarModel;


