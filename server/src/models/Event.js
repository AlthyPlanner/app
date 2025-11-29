const pool = require('../db/connection');

// Helper to check if database is available
function isDatabaseAvailable() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    return false;
  }
  // Check if pool exists and is a real Pool instance (not the dummy object)
  // The dummy object has query as a function that rejects, but we can check if it's a Pool
  // by checking if it has Pool-specific properties or by trying to see if it's not the dummy
  if (!pool || typeof pool.query !== 'function') {
    return false;
  }
  // The dummy object's query function rejects, but we can't check that synchronously
  // So we'll just check if DATABASE_URL is set and pool exists
  // The actual query will fail gracefully if pool is not available
  return true;
}

class Event {
  // Get all events for a user
  static async getAll(userId) {
    try {
      // Check if database is available
      if (!isDatabaseAvailable()) {
        throw new Error('Database connection not available');
      }

      const result = await pool.query(
        `SELECT 
          e.id,
          e.user_id,
          e.title,
          e.description,
          e.location,
          e.category,
          e.goal_id,
          e.source,
          e.external_event_id,
          e.start_time,
          e.end_time,
          e.is_all_day,
          e.created_at,
          e.updated_at
        FROM events e
        WHERE e.user_id = $1
        ORDER BY e.start_time ASC`,
        [userId]
      );
      
      // Transform to match frontend format
      return result.rows.map(row => {
        // Handle null or invalid dates
        let startDate, endDate;
        try {
          startDate = row.start_time ? new Date(row.start_time) : new Date();
          endDate = row.end_time ? new Date(row.end_time) : new Date();
          
          // Validate dates
          if (isNaN(startDate.getTime())) {
            console.warn(`Invalid start_time for event ${row.id}: ${row.start_time}`);
            startDate = new Date();
          }
          if (isNaN(endDate.getTime())) {
            console.warn(`Invalid end_time for event ${row.id}: ${row.end_time}`);
            endDate = new Date(startDate.getTime() + 3600000); // Default 1 hour after start
          }
        } catch (dateError) {
          console.error(`Error parsing dates for event ${row.id}:`, dateError);
          startDate = new Date();
          endDate = new Date(startDate.getTime() + 3600000);
        }

        return {
          id: row.id,
          summary: row.title || '',
          description: row.description || '',
          location: row.location || '',
          category: row.category || null,
          goal_id: row.goal_id,
          source: row.source || 'local',
          external_event_id: row.external_event_id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          is_all_day: row.is_all_day || false,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      console.error('Error stack:', error.stack);
      // Re-throw the error so the route handler can decide what to do
      // (e.g., fall back to file-based calendar)
      throw error;
    }
  }

  // Check if event exists by external_event_id (optimized for Google Calendar sync)
  static async existsByExternalId(userId, externalEventId) {
    try {
      if (!isDatabaseAvailable()) {
        return null;
      }
      
      const result = await pool.query(
        `SELECT id FROM events 
         WHERE user_id = $1 AND external_event_id = $2 
         LIMIT 1`,
        [userId, externalEventId]
      );
      
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('Error checking event existence:', error);
      return null;
    }
  }

  // Get events by date range (optimized for calendar views)
  static async getByDateRange(userId, startDate, endDate) {
    try {
      if (!isDatabaseAvailable()) {
        throw new Error('Database connection not available');
      }

      const result = await pool.query(
        `SELECT 
          e.id,
          e.user_id,
          e.title,
          e.description,
          e.location,
          e.category,
          e.goal_id,
          e.source,
          e.external_event_id,
          e.start_time,
          e.end_time,
          e.is_all_day,
          e.created_at,
          e.updated_at
        FROM events e
        WHERE e.user_id = $1 
          AND e.start_time >= $2 
          AND e.start_time <= $3
        ORDER BY e.start_time ASC`,
        [userId, startDate, endDate]
      );
      
      // Transform to match frontend format
      return result.rows.map(row => {
        let startDate, endDate;
        try {
          startDate = row.start_time ? new Date(row.start_time) : new Date();
          endDate = row.end_time ? new Date(row.end_time) : new Date();
          
          if (isNaN(startDate.getTime())) startDate = new Date();
          if (isNaN(endDate.getTime())) endDate = new Date(startDate.getTime() + 3600000);
        } catch (dateError) {
          startDate = new Date();
          endDate = new Date(startDate.getTime() + 3600000);
        }

        return {
          id: row.id,
          summary: row.title || '',
          description: row.description || '',
          location: row.location || '',
          category: row.category || null,
          goal_id: row.goal_id,
          source: row.source || 'local',
          external_event_id: row.external_event_id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          is_all_day: row.is_all_day || false,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      throw error;
    }
  }

  // Get a single event by ID
  static async getById(eventId, userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM events WHERE id = $1 AND user_id = $2`,
        [eventId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        summary: row.title,
        description: row.description || '',
        location: row.location || '',
        category: row.category || null,
        goal_id: row.goal_id,
        source: row.source || 'local',
        external_event_id: row.external_event_id,
        start: new Date(row.start_time).toISOString(),
        end: new Date(row.end_time).toISOString(),
        is_all_day: row.is_all_day,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  // Create a new event
  static async create(userId, eventData) {
    try {
      const {
        summary: title,
        start,
        end,
        category,
        location,
        description,
        goal_id,
        is_all_day,
        source,
        external_event_id
      } = eventData;

      if (!title || !start || !end) {
        throw new Error('Title, start, and end are required');
      }

      const result = await pool.query(
        `INSERT INTO events (
          user_id, title, description, location, category, goal_id,
          source, external_event_id, start_time, end_time, is_all_day,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          title.trim(),
          description || null,
          location || null,
          category || null,
          goal_id || null,
          source || 'local',
          external_event_id || null,
          new Date(start),
          new Date(end),
          is_all_day || false
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        summary: row.title,
        description: row.description || '',
        location: row.location || '',
        category: row.category || null,
        goal_id: row.goal_id,
        source: row.source || 'local',
        external_event_id: row.external_event_id,
        start: new Date(row.start_time).toISOString(),
        end: new Date(row.end_time).toISOString(),
        is_all_day: row.is_all_day,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update an event
  static async update(eventId, userId, eventData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (eventData.summary !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(eventData.summary.trim());
      }
      if (eventData.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(eventData.description || null);
      }
      if (eventData.location !== undefined) {
        updates.push(`location = $${paramCount++}`);
        values.push(eventData.location || null);
      }
      if (eventData.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(eventData.category || null);
      }
      if (eventData.goal_id !== undefined) {
        updates.push(`goal_id = $${paramCount++}`);
        values.push(eventData.goal_id || null);
      }
      if (eventData.start !== undefined) {
        updates.push(`start_time = $${paramCount++}`);
        values.push(new Date(eventData.start));
      }
      if (eventData.end !== undefined) {
        updates.push(`end_time = $${paramCount++}`);
        values.push(new Date(eventData.end));
      }
      if (eventData.is_all_day !== undefined) {
        updates.push(`is_all_day = $${paramCount++}`);
        values.push(eventData.is_all_day);
      }

      if (updates.length === 0) {
        return await this.getById(eventId, userId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(eventId, userId);

      const result = await pool.query(
        `UPDATE events 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        summary: row.title,
        description: row.description || '',
        location: row.location || '',
        category: row.category || null,
        goal_id: row.goal_id,
        source: row.source || 'local',
        external_event_id: row.external_event_id,
        start: new Date(row.start_time).toISOString(),
        end: new Date(row.end_time).toISOString(),
        is_all_day: row.is_all_day,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete an event
  static async delete(eventId, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id`,
        [eventId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      return { message: 'Event deleted successfully' };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}

module.exports = Event;


