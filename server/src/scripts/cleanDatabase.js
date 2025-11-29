require('dotenv').config();
const pool = require('../db/connection');

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database (keeping emails table)...');
    
    // Get all table names except emails
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'emails'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables to clean:`, tables.join(', '));
    
    // Disable foreign key checks temporarily (PostgreSQL doesn't have this, but we'll delete in order)
    // Delete in reverse order of dependencies to avoid foreign key issues
    const deleteOrder = [
      'habit_completions',
      'chat_messages',
      'goal_milestones',
      'habits',
      'events',
      'tasks',
      'goals',
      'friendships',
      'users'
    ];
    
    // Filter to only tables that exist
    const tablesToDelete = deleteOrder.filter(table => tables.includes(table));
    
    for (const table of tablesToDelete) {
      try {
        const result = await pool.query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted ${result.rowCount} row(s) from ${table}`);
      } catch (error) {
        console.error(`❌ Error deleting from ${table}:`, error.message);
      }
    }
    
    // Also delete from any other tables that weren't in our ordered list
    const remainingTables = tables.filter(table => !tablesToDelete.includes(table));
    for (const table of remainingTables) {
      try {
        const result = await pool.query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted ${result.rowCount} row(s) from ${table}`);
      } catch (error) {
        console.error(`❌ Error deleting from ${table}:`, error.message);
      }
    }
    
    console.log('✅ Database cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

cleanDatabase();

