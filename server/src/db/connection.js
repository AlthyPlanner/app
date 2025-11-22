const { Pool } = require('pg');

// Create PostgreSQL connection pool
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit process, just log the error
  });

  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Database connection error:', err.message);
    } else {
      console.log('✅ Database connected successfully');
    }
  });
} else {
  console.warn('⚠️  DATABASE_URL not set. Database features will not work.');
  // Create a dummy pool that throws errors
  pool = {
    query: () => Promise.reject(new Error('DATABASE_URL not configured')),
  };
}

module.exports = pool;

