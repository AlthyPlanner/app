# PostgreSQL Setup Guide for Railway

## Quick Setup

### 1. Add PostgreSQL to Railway

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable
   - Provide connection credentials

### 2. Environment Variables

Railway automatically sets `DATABASE_URL`. You don't need to configure it manually!

The connection string format:
```
postgresql://user:password@host:port/database
```

### 3. Database Tables

The database tables are automatically created on server startup via `src/db/migrations.js`.

**Emails Table Schema:**
- `id` - Primary key (auto-increment)
- `email` - Email address (unique, indexed)
- `source` - Source of signup ('hero', 'footer', 'educator')
- `name` - Name (for educator inquiries)
- `organization` - Organization (for educator inquiries)
- `message` - Message (for educator inquiries)
- `created_at` - Timestamp when email was added
- `updated_at` - Timestamp when email was last updated

### 4. Verify Setup

After deploying, check Railway logs for:
- `✅ Database connected successfully`
- `✅ Database tables initialized`

### 5. Accessing Your Database

**Via Railway Dashboard:**
1. Click on your PostgreSQL service
2. Go to **"Data"** tab
3. Use the built-in SQL editor to query data

**Via Connection String:**
Railway provides `DATABASE_URL` which you can use with any PostgreSQL client.

## Local Development

For local development, you can:

1. **Use Railway's PostgreSQL** (recommended):
   - Copy `DATABASE_URL` from Railway
   - Add to your local `.env` file:
     ```
     DATABASE_URL=postgresql://user:password@host:port/database
     ```

2. **Use Local PostgreSQL**:
   - Install PostgreSQL locally
   - Create a database
   - Set `DATABASE_URL` in `.env`

3. **Use Docker**:
   ```bash
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
   ```

## Migration Script

To manually run migrations:

```bash
node src/db/migrations.js
```

Or it runs automatically on server startup.

## Benefits Over JSON Files

✅ **Persistent** - Data survives redeployments  
✅ **Scalable** - Handles large amounts of data  
✅ **Reliable** - ACID transactions  
✅ **Queryable** - SQL queries for analytics  
✅ **Indexed** - Fast lookups  

## Next Steps

Consider migrating other data models to PostgreSQL:
- Todos (`src/models/Todo.js`)
- Calendar Events (`src/models/Calendar.js`)
- Types (`src/models/Type.js`)

