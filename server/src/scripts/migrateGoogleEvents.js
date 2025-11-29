/**
 * Migration script to move Google Calendar events from events.json to database
 * Run with: node src/scripts/migrateGoogleEvents.js <userId>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Event = require('../models/Event');
const pool = require('../db/connection');

const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

async function migrateGoogleEvents(userId) {
  try {
    console.log(`🔄 Migrating Google events to database for user ${userId}...`);
    
    // Read events.json
    const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    const googleEvents = eventsData.filter(e => e.source === 'google');
    
    if (googleEvents.length === 0) {
      console.log('✅ No Google events found in events.json');
      return;
    }
    
    console.log(`📋 Found ${googleEvents.length} Google events in events.json`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const googleEvent of googleEvents) {
      try {
        // Use googleId if available, otherwise use id
        const externalEventId = googleEvent.googleId || googleEvent.id;
        
        // Check if event already exists in database
        const existingId = await Event.existsByExternalId(userId, externalEventId);
        
        if (existingId) {
          console.log(`⏭️  Skipping ${googleEvent.summary} - already in database`);
          skipped++;
          continue;
        }
        
        // Prepare event data
        const eventData = {
          summary: googleEvent.summary || 'No Title',
          start: googleEvent.start,
          end: googleEvent.end,
          description: googleEvent.description || '',
          location: googleEvent.location || '',
          source: 'google',
          external_event_id: externalEventId,
          category: googleEvent.category || null
        };
        
        // Create event in database
        await Event.create(userId, eventData);
        console.log(`✅ Migrated: ${googleEvent.summary}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${googleEvent.summary}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    // Verify migration
    const dbResult = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE user_id = $1 AND source = $2',
      [userId, 'google']
    );
    console.log(`\n📈 Google events in database: ${dbResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Get userId from command line argument
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node src/scripts/migrateGoogleEvents.js <userId>');
  process.exit(1);
}

migrateGoogleEvents(parseInt(userId))
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

