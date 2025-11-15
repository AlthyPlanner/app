# Althy Planner

A personal planning assistant application that helps you manage tasks, events, and goals with AI-powered chat support. Integrates with Google Calendar and Outlook Calendar for seamless scheduling.

## Features

- ✅ **Task Management** - Create, edit, and organize tasks with priority levels
- ✅ **Calendar Integration** - View and manage events with Google Calendar and Outlook support
- ✅ **AI Chat Assistant** - Chat with Althy to add tasks, create events, and get planning suggestions
- ✅ **Daily Balance Tracking** - Monitor your workload and maintain lifestyle balance
- ✅ **Goal Setting** - Set and track personal goals
- ✅ **Quick Notes** - Capture quick thoughts and reminders
- ✅ **Event Categorization** - Organize events by category (Work, Study, Personal, Leisure, Fitness, Health, Travel, Rest)
- ✅ **Chat History** - Save and review past conversations with Althy

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Google Cloud Console** account (for Google Calendar integration - optional)
- **Microsoft Azure** account (for Outlook Calendar integration - optional)
- **OpenAI API Key** (for AI chat features - optional but recommended)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd althyplanner
```

### 2. Install Dependencies

Install dependencies for both client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Variables Setup

Create a `.env` file in the `server` directory:

```bash
cd server
touch .env
```

Add the following environment variables to `server/.env`:

```env
# Server Configuration
PORT=5001
SESSION_SECRET=your-session-secret-key-here

# OpenAI Configuration (Required for AI chat features)
OPENAI_API_KEY=your-openai-api-key-here

# Google Calendar Integration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Outlook Calendar Integration (Optional)
OUTLOOK_CLIENT_ID=your-outlook-client-id-here
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret-here
OUTLOOK_REDIRECT_URI=http://localhost:5001/api/outlook/auth/microsoft/callback
```

**Note:** 
- `SESSION_SECRET` should be a random string (e.g., generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY` is required for AI chat features. Get one at [OpenAI Platform](https://platform.openai.com/)
- Google Calendar and Outlook integrations are optional. See setup guides below for detailed instructions.

## Running the Application

### Development Mode

You need to run both the server and client in separate terminals:

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```

The server will start on `http://localhost:5001` (or the port specified in your `.env` file).

**Terminal 2 - Frontend Client:**
```bash
cd client
npm start
```

The client will start on `http://localhost:3001` and automatically open in your browser.

### Production Mode

**Build the client:**
```bash
cd client
npm run build
```

**Start the server:**
```bash
cd server
npm start
```

## Project Structure

```
althyplanner/
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── features/  # Feature components (TodoList, QuickNotes, etc.)
│   │   │   ├── layout/    # Layout components (Header, MobileMenu)
│   │   │   ├── modals/    # Modal components
│   │   │   └── pages/     # Page components (AlthyPage, CalendarPage, etc.)
│   │   ├── utils/         # Utility functions
│   │   └── api.js         # API client
│   └── package.json
├── server/                 # Express backend server
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Data models (Todo, Calendar, Type)
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic services
│   │   └── data/          # JSON data files
│   └── package.json
├── GOOGLE_CALENDAR_SETUP.md    # Google Calendar integration guide
├── OUTLOOK_CALENDAR_SETUP.md   # Outlook Calendar integration guide
└── README.md                    # This file
```

## API Endpoints

### Tasks
- `GET /api/todos` - Get all tasks
- `POST /api/todos` - Create a new task
- `PATCH /api/todos/:index` - Update a task
- `PATCH /api/todos/:index/priority` - Update task priority
- `DELETE /api/todos/:index` - Delete a task

### Chat
- `POST /api/chat` - Send a message to Althy (AI assistant)
- `GET /api/chat` - Test endpoint

### Calendar
- `GET /api/calendar` - Get calendar events
- `POST /api/calendar` - Create a calendar event

### Google Calendar (if configured)
- `GET /api/google/auth/google` - Initiate Google OAuth
- `GET /api/google/auth/google/callback` - Google OAuth callback
- `GET /api/google/events` - Get Google Calendar events

### Outlook Calendar (if configured)
- `GET /api/outlook/auth/microsoft` - Initiate Microsoft OAuth
- `GET /api/outlook/auth/microsoft/callback` - Microsoft OAuth callback
- `GET /api/outlook/events` - Get Outlook Calendar events

## Integration Setup Guides

### Google Calendar Integration

See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed instructions on:
- Setting up Google Cloud Console
- Creating OAuth credentials
- Configuring redirect URIs
- Enabling Google Calendar API

### Outlook Calendar Integration

See [OUTLOOK_CALENDAR_SETUP.md](./OUTLOOK_CALENDAR_SETUP.md) for detailed instructions on:
- Setting up Azure Portal
- Creating app registration
- Configuring API permissions
- Creating client secrets

## Usage

### Adding Tasks

1. Navigate to the **Tasks** page
2. Enter a task in the input field
3. Set priority (None, Low, High) if desired
4. Click "Add Task" or press Enter

### Chatting with Althy

1. Navigate to the **Althy** page
2. Type a message in the chat input
3. Althy can help you:
   - Add tasks: "add task of running 1 mile tomorrow at 8am"
   - Create events: "add event for team meeting on Friday at 2pm"
   - Get planning suggestions
   - Answer questions about your schedule

### Managing Calendar Events

1. Navigate to the **Plan** (Calendar) page
2. Click on a time slot to create an event
3. Fill in event details and select a category
4. Events are color-coded by category
5. Toggle Google Calendar or Outlook Calendar visibility using the dropdown

### Setting Goals

1. Navigate to the **Goals** page
2. Click "Add Goal" to create a new goal
3. Set milestones and track progress

## Troubleshooting

### Server won't start

**Port already in use:**
```bash
# Find and kill the process using port 5001
lsof -ti:5001 | xargs kill -9
```

**Missing dependencies:**
```bash
cd server
npm install
```

### Client won't start

**Port 3001 already in use:**
```bash
# Find and kill the process using port 3001
lsof -ti:3001 | xargs kill -9
```

**Missing dependencies:**
```bash
cd client
npm install
```

### Chat not working (ERR_EMPTY_RESPONSE)

1. **Check OpenAI API Key:**
   - Ensure `OPENAI_API_KEY` is set in `server/.env`
   - Verify the API key is valid and has credits

2. **Check server logs:**
   - Look for error messages in the server console
   - Verify the server is running on the correct port

3. **Check network:**
   - Ensure the client can reach the server
   - Check CORS settings if accessing from a different origin

### Calendar integrations not working

- **Google Calendar:** See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for troubleshooting
- **Outlook Calendar:** See [OUTLOOK_CALENDAR_SETUP.md](./OUTLOOK_CALENDAR_SETUP.md) for troubleshooting

### Environment variables not loading

- Ensure `.env` file is in the `server` directory (not root)
- Restart the server after changing `.env` file
- Check for typos in variable names

## Development

### Running in Development Mode

The server uses `nodemon` for auto-restart on file changes:

```bash
cd server
npm run dev
```

The client uses React's development server with hot reload:

```bash
cd client
npm start
```

### Code Structure

- **Frontend:** React with functional components and hooks
- **Backend:** Express.js with RESTful API design
- **Data Storage:** JSON files (can be migrated to a database)
- **AI Integration:** OpenAI GPT-3.5-turbo for chat responses

## Security Notes

- ⚠️ **Never commit `.env` files** to version control
- Use strong `SESSION_SECRET` values in production
- Enable HTTPS in production
- Set `secure: true` for session cookies in production
- Regularly rotate API keys and secrets

## License

[Add your license here]

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the integration setup guides
- Check server and browser console logs for errors

