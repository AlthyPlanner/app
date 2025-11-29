require('dotenv').config();
const pool = require('../db/connection');

async function cleanTasks() {
  try {
    console.log('🗑️  Cleaning tasks table...');
    
    const result = await pool.query('DELETE FROM tasks');
    
    console.log(`✅ Deleted ${result.rowCount} task(s) from the database`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning tasks table:', error);
    process.exit(1);
  }
}

cleanTasks();

