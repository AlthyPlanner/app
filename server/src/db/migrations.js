const pool = require('./connection');

// Check if database is already initialized
async function isDatabaseInitialized() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Check if database is already initialized
    const isInitialized = await isDatabaseInitialized();
    if (isInitialized) {
      console.log('✅ Database already initialized, skipping schema creation');
      return;
    }
    
    console.log('🗄️  Creating database schema...');
    // Create emails table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        source VARCHAR(50) DEFAULT 'unknown',
        name VARCHAR(255),
        organization VARCHAR(255),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on email for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_emails_email ON emails(email)
    `);

    // ===========================
    //  USERS
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name VARCHAR(255),
        timezone VARCHAR(100) DEFAULT 'UTC',
        chronotype VARCHAR(50),
        planning_style VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Fix existing table structure - make username nullable if it exists
    await pool.query(`
      DO $$ 
      BEGIN
        -- Make username nullable if it exists and has NOT NULL constraint
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'username'
        ) THEN
          ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
        END IF;
        
        -- Add name column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'name'
        ) THEN
          ALTER TABLE users ADD COLUMN name VARCHAR(255);
        END IF;
        
        -- Add timezone column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'timezone'
        ) THEN
          ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC';
        END IF;
        
        -- Add chronotype column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'chronotype'
        ) THEN
          ALTER TABLE users ADD COLUMN chronotype VARCHAR(50);
        END IF;
        
        -- Add planning_style column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'planning_style'
        ) THEN
          ALTER TABLE users ADD COLUMN planning_style VARCHAR(50);
        END IF;
        
        -- Add Google Calendar token columns if they don't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'google_access_token'
        ) THEN
          ALTER TABLE users ADD COLUMN google_access_token TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'google_refresh_token'
        ) THEN
          ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'google_profile'
        ) THEN
          ALTER TABLE users ADD COLUMN google_profile JSONB;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // ===========================
    //  FRIENDSHIPS (Friends Circle)
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id)
    `);

    // ===========================
    //  GOALS
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        target VARCHAR(255),
        target_date DATE,
        progress_percent INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status)
    `);

    // ===========================
    //  GOAL MILESTONES
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goal_milestones (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id)
    `);

    // Add missing columns to existing tables (for migrations)
    await pool.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'none'
    `);
    await pool.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT
    `);
    await pool.query(`
      ALTER TABLE goals ADD COLUMN IF NOT EXISTS category VARCHAR(100)
    `);
    await pool.query(`
      ALTER TABLE goals ADD COLUMN IF NOT EXISTS target VARCHAR(255)
    `);
    await pool.query(`
      ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);

    // ===========================
    //  TASKS
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        goal_id INTEGER REFERENCES goals(id),
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'none',
        due_date DATE,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
    `);

    // ===========================
    //  EVENTS
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        category VARCHAR(100),
        goal_id INTEGER REFERENCES goals(id),
        source VARCHAR(50),
        external_event_id VARCHAR(255),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_all_day BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for optimal query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_goal_id ON events(goal_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time)
    `);
    // Composite index for fast lookups by user_id + external_event_id (used in Google sync)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_user_external ON events(user_id, external_event_id)
    `);
    // Index for filtering by source (Google, local, etc.)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_source ON events(user_id, source)
    `);
    // Index for date range queries (common in calendar views)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_user_start_time ON events(user_id, start_time)
    `);
    // Index for category filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_category ON events(user_id, category)
    `);

    // ===========================
    //  HABITS
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        frequency VARCHAR(50) DEFAULT 'daily',
        reminder_time TIME,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        archived_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)
    `);

    // ===========================
    //  HABIT COMPLETIONS (Streak Tracking)
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_completions (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
        completion_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(habit_id, completion_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completion_date)
    `);

    // ===========================
    //  CHAT MESSAGES (AI Memory)
    // ===========================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        context_type VARCHAR(20),
        context_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_context ON chat_messages(context_type, context_id)
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    // If tables already exist, that's okay - just log and continue
    if (error.message && error.message.includes('already exists')) {
      console.log('✅ Database tables already exist');
      return;
    }
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Run migrations on startup
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };

