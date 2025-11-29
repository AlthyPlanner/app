require('dotenv').config();
const pool = require('../db/connection');

async function removeEndTimeColumn() {
  try {
    console.log('🗑️  Removing end_time column from tasks table...');
    
    // Check if column exists first
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'end_time'
      )
    `);
    
    if (!checkResult.rows[0].exists) {
      console.log('✅ end_time column does not exist, nothing to remove');
      process.exit(0);
    }
    
    // Remove the column
    await pool.query('ALTER TABLE tasks DROP COLUMN end_time');
    
    console.log('✅ Successfully removed end_time column from tasks table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing end_time column:', error);
    process.exit(1);
  }
}

removeEndTimeColumn();

