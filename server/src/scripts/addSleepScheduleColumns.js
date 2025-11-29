require('dotenv').config();
const pool = require('../db/connection');

async function addSleepScheduleColumns() {
  try {
    console.log('🔄 Adding sleep schedule columns to users table...');
    
    // Add wake_time column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'wake_time'
        ) THEN
          ALTER TABLE users ADD COLUMN wake_time TIME;
          RAISE NOTICE 'Added wake_time column';
        ELSE
          RAISE NOTICE 'wake_time column already exists';
        END IF;
      END $$;
    `);
    
    // Add sleep_time column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'sleep_time'
        ) THEN
          ALTER TABLE users ADD COLUMN sleep_time TIME;
          RAISE NOTICE 'Added sleep_time column';
        ELSE
          RAISE NOTICE 'sleep_time column already exists';
        END IF;
      END $$;
    `);
    
    console.log('✅ Successfully added sleep schedule columns');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding sleep schedule columns:', error);
    process.exit(1);
  }
}

addSleepScheduleColumns();

