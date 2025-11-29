const { OpenAI } = require('openai');
const Todo = require('../models/Todo');
const Calendar = require('../models/Calendar');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Event = require('../models/Event');

let openai = null;

const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

const chatActionService = {
  /**
   * Detect user intent from message
   * @param {string} prompt - User message
   * @returns {Promise<string>} - 'task', 'event', or 'chat'
   */
  async detectIntent(prompt) {
    try {
      const intentPrompt = `Analyze this user message and determine if they want to:
1. Create a task/todo (keywords: add task, create task, new task, todo, remind me, task:)
2. Create a calendar event (keywords: add event, create event, schedule, meeting, appointment, calendar, event:)
3. Create a goal or habit (keywords: add goal, create goal, new goal, set goal, goal, add habit, create habit, new habit, habit)
4. Just chat (anything else)

User message: "${prompt}"

Respond with ONLY one word: "task", "event", "goal", or "chat"`;

      const openaiClient = getOpenAI();
      if (!openaiClient) {
        throw new Error('OpenAI not configured');
      }
      
      const intentCompletion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: intentPrompt }],
        temperature: 0.3,
        max_tokens: 10
      });
      
      const intentResponse = intentCompletion.choices[0].message.content.trim().toLowerCase();
      if (intentResponse.includes('task')) return 'task';
      if (intentResponse.includes('event')) return 'event';
      if (intentResponse.includes('goal') || intentResponse.includes('habit')) return 'goal';
      return 'chat';
    } catch (err) {
      console.error('Error detecting intent:', err);
      // Fallback to keyword-based detection
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('add task') || lowerPrompt.includes('create task') || 
          lowerPrompt.includes('new task') || lowerPrompt.includes('todo') || 
          lowerPrompt.includes('remind me') || lowerPrompt.includes('task:')) {
        return 'task';
      }
      if (lowerPrompt.includes('add event') || lowerPrompt.includes('create event') || 
          lowerPrompt.includes('schedule') || lowerPrompt.includes('meeting') || 
          lowerPrompt.includes('appointment') || lowerPrompt.includes('calendar') || 
          lowerPrompt.includes('event:')) {
        return 'event';
      }
      if (lowerPrompt.includes('add goal') || lowerPrompt.includes('create goal') || 
          lowerPrompt.includes('new goal') || lowerPrompt.includes('set goal') || 
          lowerPrompt.includes('add habit') || lowerPrompt.includes('create habit') || 
          lowerPrompt.includes('new habit') || lowerPrompt.includes('goal:') ||
          lowerPrompt.includes('habit:')) {
        return 'goal';
      }
      return 'chat';
    }
  },

  /**
   * Check if task request has enough information to create a task
   * @param {string} prompt - User message
   * @returns {Promise<Object>} - { hasEnoughInfo: boolean, reason?: string }
   */
  async checkTaskCompleteness(prompt) {
    const checkPrompt = `Analyze this task request: "${prompt}"

Determine if the user has provided enough information to create a task:
- Does it have a clear task description/title? (not just "add task" or "create task")
- Is it a specific, actionable task?

Respond with ONLY a JSON object:
{"hasEnoughInfo": true/false, "reason": "brief explanation"}`;

    try {
      const openaiClient = getOpenAI();
      if (!openaiClient) {
        throw new Error('OpenAI not configured');
      }
      
      const checkCompletion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: checkPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(checkCompletion.choices[0].message.content);
      return result;
    } catch (err) {
      console.error('Error checking task completeness:', err);
      // Fallback: check if prompt is too short or just keywords
      const lowerPrompt = prompt.toLowerCase().trim();
      const taskKeywords = ['add task', 'create task', 'new task', 'task'];
      const isJustKeyword = taskKeywords.some(keyword => 
        lowerPrompt === keyword || lowerPrompt === `${keyword}:` || lowerPrompt.startsWith(`${keyword} `) && lowerPrompt.length < 20
      );
      
      return {
        hasEnoughInfo: !isJustKeyword && lowerPrompt.length > 10,
        reason: isJustKeyword ? 'Only keywords provided, no task description' : 'Unable to determine'
      };
    }
  },

  /**
   * Create a task from natural language
   * @param {string} prompt - User message
   * @param {number|null} userId - User ID if authenticated, null otherwise
   * @returns {Promise<Object>} - Action result with success status and message
   */
  async createTask(prompt, userId = null) {
    // Calculate current date information for the prompt
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = String(now.getDate()).padStart(2, '0');
    const today = `${todayYear}-${todayMonth}-${todayDay}`;
    
    // Calculate tomorrow in local timezone
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowYear = tomorrowDate.getFullYear();
    const tomorrowMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrowDate.getDate()).padStart(2, '0');
    const tomorrow = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
    
    const parsePrompt = `Extract task details from this message: "${prompt}"

IMPORTANT DATE CONTEXT:
- Today's date is: ${today}
- Tomorrow's date is: ${tomorrow}

When the user says "today", use exactly: ${today}
When the user says "tomorrow", use exactly: ${tomorrow}

Extract:
- todo: the task title/description (required). Include the full task description. For example, "add task of running 1 mile tomorrow at 8am" should extract "running 1 mile" as the todo.
- due: due date in YYYY-MM-DD format or null if not specified. Use the exact dates provided above for "today" or "tomorrow".
- dueTime: time in HH:mm format using 24-hour format (e.g., "14:00" for 2pm, "08:00" for 8am) or null if no time is mentioned. Extract the time if mentioned (e.g., "8am", "2pm", "14:00").
- priority: "high", "low", or "none" (look for words like urgent, important, high priority, or low priority)
- category: one of "work", "study", "personal", "leisure", "fitness", "health", "travel", "rest", or empty string. Infer from the task description if possible (e.g., "running" -> "fitness", "study" -> "study", "meeting" -> "work")

Examples:
- "add task of running 1 mile tomorrow at 8am" -> {"todo": "running 1 mile", "due": "${tomorrow}", "dueTime": "08:00", "priority": "none", "category": "fitness"}
- "add task: buy groceries today at 2pm" -> {"todo": "buy groceries", "due": "${today}", "dueTime": "14:00", "priority": "none", "category": "personal"}
- "add task: buy groceries" -> {"todo": "buy groceries", "due": null, "dueTime": null, "priority": "none", "category": "personal"}

Respond with ONLY a JSON object in this exact format:
{"todo": "task title", "due": "2024-12-15" or null or "${today}" or "${tomorrow}", "dueTime": "08:00" or null, "priority": "high"|"low"|"none", "category": "work"|"study"|"personal"|"leisure"|"fitness"|"health"|"travel"|"rest"|""}`;

    try {
      const openaiClient = getOpenAI();
      if (!openaiClient) {
        throw new Error('OpenAI not configured');
      }
      
      const parseCompletion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const responseContent = parseCompletion.choices[0].message.content;
      console.log('OpenAI parsing response:', responseContent);
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseContent);
      } catch (parseErr) {
        console.error('Error parsing OpenAI JSON response:', parseErr);
        console.error('Response content:', responseContent);
        return {
          type: 'task',
          success: false,
          message: "I had trouble understanding the task format. Could you please rephrase? For example: 'Add task: Buy groceries due tomorrow'"
        };
      }
      
      console.log('Parsed task data:', parsedData);
      
      if (!parsedData.todo || !parsedData.todo.trim()) {
        console.log('Task data missing todo field:', parsedData);
        return {
          type: 'task',
          success: false,
          message: "I'd be happy to add a task for you! Could you please tell me what the task is? For example: 'Add task: Buy groceries' or 'Remind me to call mom'"
        };
      }

      // Convert "today" and "tomorrow" to actual dates (using local timezone)
      let dueDate = parsedData.due;
      if (dueDate && typeof dueDate === 'string') {
        const now = new Date();
        if (dueDate.toLowerCase() === 'today') {
          // Use local timezone to format date
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          dueDate = `${year}-${month}-${day}`;
        } else if (dueDate.toLowerCase() === 'tomorrow') {
          // Calculate tomorrow in local timezone
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const year = tomorrow.getFullYear();
          const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const day = String(tomorrow.getDate()).padStart(2, '0');
          dueDate = `${year}-${month}-${day}`;
        }
        // If OpenAI already returned a date in YYYY-MM-DD format, use it as is
        // (it should match the dates we provided in the prompt)
      }
      
      // Parse dueTime if provided
      let dueTime = null;
      if (parsedData.dueTime && dueDate) {
        try {
          // Parse time string (HH:mm format)
          const [hours, minutes] = parsedData.dueTime.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            // Create a date-time object combining due date and due time
            const [year, month, day] = dueDate.split('-').map(Number);
            dueTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
            console.log('Parsed dueTime:', dueTime.toISOString());
          }
        } catch (timeErr) {
          console.warn('Error parsing dueTime:', timeErr);
        }
      }
      
      console.log('Final due date being saved:', dueDate);
      console.log('Due time being saved:', dueTime ? dueTime.toISOString() : null);

      try {
        let newTodo;
        
        // If userId is provided, use database Task model
        if (userId) {
          try {
            newTodo = await Task.create(userId, {
              todo: parsedData.todo.trim(),
              due: dueDate || null,
              due_time: dueTime,
              category: parsedData.category || '',
              priority: parsedData.priority || 'none',
              status: null
            });
            console.log('✅ Task created in database:', newTodo);
          } catch (dbErr) {
            console.error('Database error creating task:', dbErr);
            // Fallback to file-based storage
            console.log('Falling back to file-based Todo storage');
            newTodo = await Todo.create({
              todo: parsedData.todo.trim(),
              due: dueDate || null,
              category: parsedData.category || '',
              priority: parsedData.priority || 'none'
            });
          }
        } else {
          // No userId, use file-based storage
          newTodo = await Todo.create({
            todo: parsedData.todo.trim(),
            due: dueDate || null,
            category: parsedData.category || '',
            priority: parsedData.priority || 'none'
          });
        }

        return {
          type: 'task',
          success: true,
          message: `Task "${parsedData.todo.trim()}" has been added!`,
          data: newTodo
        };
      } catch (createErr) {
        console.error('Error creating task:', createErr);
        return {
          type: 'task',
          success: false,
          message: `I understood the task, but couldn't save it: ${createErr.message || 'Database error'}. Please try again.`
        };
      }
    } catch (err) {
      console.error('Error parsing/creating task:', err);
      console.error('Error stack:', err.stack);
      return {
        type: 'task',
        success: false,
        message: "I couldn't understand the task details. Could you please rephrase? For example: 'Add task: Buy groceries due tomorrow'"
      };
    }
  },

  /**
   * Create an event from natural language
   * @param {string} prompt - User message
   * @param {number|null} userId - User ID if authenticated, null otherwise
   * @returns {Promise<Object>} - Action result with success status and message
   */
  async createEvent(prompt, userId = null) {
    const now = new Date();
    // Get today's date in local timezone (YYYY-MM-DD)
    const todayYear = now.getFullYear();
    const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = String(now.getDate()).padStart(2, '0');
    const today = `${todayYear}-${todayMonth}-${todayDay}`;
    
    // Calculate tomorrow in local timezone using date arithmetic
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowYear = tomorrowDate.getFullYear();
    const tomorrowMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrowDate.getDate()).padStart(2, '0');
    const tomorrow = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const parsePrompt = `Extract calendar event details from this message: "${prompt}"

CRITICAL: Parse dates and times as LOCAL time (not UTC). 
- When the user says "today", you MUST use exactly this date: ${today}
- When the user says "tomorrow", you MUST use exactly this date: ${tomorrow}
- Do NOT calculate dates yourself - use the exact dates provided below
- When they give a time like "2pm" or "14:00", use that exact time on the specified date.

Extract:
- summary: the event title/name (required)
- startDate: date in YYYY-MM-DD format (e.g., "2024-12-15")
- startTime: time in HH:mm format using 24-hour format (e.g., "14:00" for 2pm, "09:00" for 9am). Default to "09:00" if only date is given.
- endDate: date in YYYY-MM-DD format. If not specified, use the same as startDate.
- endTime: time in HH:mm format. If not specified, make it 1 hour after startTime (e.g., if start is "14:00", end is "15:00").
- category: one of "work", "study", "personal", "leisure", "fitness", "health", "travel", "rest", or "work" as default

Parse dates like:
- "today at 2pm" -> startDate: "${today}", startTime: "14:00"
- "tomorrow at 10am" -> startDate: "${tomorrow}", startTime: "10:00"
- "12/15/2024 at 3pm" -> startDate: "2024-12-15", startTime: "15:00"
- "2pm to 4pm" -> startDate: "${today}", startTime: "14:00", endDate: "${today}", endTime: "16:00"
- "meeting on Friday at 2pm" -> calculate Friday's date, startDate: "YYYY-MM-DD", startTime: "14:00"

Current date/time context:
- Today: ${today}
- Tomorrow: ${tomorrow}
- Current time: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}

Respond with ONLY a JSON object in this exact format:
{"summary": "event title", "startDate": "2024-12-15", "startTime": "14:00", "endDate": "2024-12-15", "endTime": "15:00", "category": "work"|"study"|"personal"|"leisure"|"fitness"|"health"|"travel"|"rest"}`;

    try {
      const openaiClient = getOpenAI();
      if (!openaiClient) {
        throw new Error('OpenAI not configured');
      }
      
      const parseCompletion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const responseContent = parseCompletion.choices[0].message.content;
      console.log('OpenAI event parsing response:', responseContent);
      console.log('Today provided to OpenAI:', today);
      console.log('Tomorrow provided to OpenAI:', tomorrow);
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseContent);
        console.log('Parsed event data:', parsedData);
        console.log('Parsed startDate:', parsedData.startDate);
        console.log('Parsed startTime:', parsedData.startTime);
      } catch (parseErr) {
        console.error('Error parsing OpenAI JSON response:', parseErr);
        console.error('Response content:', responseContent);
        return {
          type: 'event',
          success: false,
          message: "I had trouble understanding the event format. Could you please rephrase? For example: 'Schedule meeting tomorrow at 2pm'"
        };
      }
      
      if (!parsedData.summary || !parsedData.summary.trim()) {
        return {
          type: 'event',
          success: false,
          message: "I'd be happy to schedule an event for you! Could you please tell me what the event is and when? For example: 'Schedule meeting with team tomorrow at 2pm' or 'Add event: Doctor appointment on 12/15/2024 at 10am'"
        };
      }

      // Parse dates and times - construct Date objects from separate date and time components
      let startTime, endTime;
      
      try {
        // Parse start date/time
        const startDateStr = parsedData.startDate || parsedData.start?.split('T')[0] || today;
        const startTimeStr = parsedData.startTime || parsedData.start?.split('T')[1]?.split(':').slice(0, 2).join(':') || '09:00';
        
        console.log('Using startDateStr:', startDateStr, 'startTimeStr:', startTimeStr);
        
        // Handle old format if OpenAI returns ISO string
        if (parsedData.start && parsedData.start.includes('T') && parsedData.start.includes('Z')) {
          // If it's already a full ISO string with timezone, parse it directly
          startTime = new Date(parsedData.start);
        } else {
          // Construct date from YYYY-MM-DD and HH:mm components
          // Parse the components
          const [year, month, day] = startDateStr.split('-').map(Number);
          let hours = 9, minutes = 0;
          
          if (startTimeStr) {
            const timeParts = startTimeStr.split(':');
            hours = parseInt(timeParts[0]) || 9;
            minutes = parseInt(timeParts[1]) || 0;
          }
          
          // Create date object in local time (this preserves the intended time)
          // When converted to ISO, it will include the timezone offset
          // The frontend will correctly display it in the user's timezone
          startTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        }
        
        // Parse end date/time
        const endDateStr = parsedData.endDate || parsedData.end?.split('T')[0] || parsedData.startDate || startDateStr;
        const endTimeStr = parsedData.endTime || parsedData.end?.split('T')[1]?.split(':').slice(0, 2).join(':') || null;
        
        if (parsedData.end && parsedData.end.includes('T') && parsedData.end.includes('Z')) {
          endTime = new Date(parsedData.end);
        } else if (endTimeStr) {
          // Construct end date from components in local time
          const [year, month, day] = endDateStr.split('-').map(Number);
          const timeParts = endTimeStr.split(':');
          const hours = parseInt(timeParts[0]) || 9;
          const minutes = parseInt(timeParts[1]) || 0;
          endTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        } else {
          // Default to 1 hour after start
          endTime = new Date(startTime.getTime() + 3600000);
        }
        
        // Validate times
        if (isNaN(startTime.getTime())) {
          console.error('Invalid start time parsed:', parsedData);
          throw new Error('Invalid start date/time');
        }
        if (isNaN(endTime.getTime())) {
          endTime = new Date(startTime.getTime() + 3600000); // Default 1 hour
        }
        if (endTime <= startTime) {
          endTime = new Date(startTime.getTime() + 3600000); // Default 1 hour if end is before/equal to start
        }
        
        // Log the parsed dates for debugging
        console.log('Parsed event times:');
        console.log('  Start date string used:', startDateStr);
        console.log('  Start time string used:', startTimeStr);
        console.log('  Start (local):', startTime.toString());
        console.log('  Start date parts:', {
          year: startTime.getFullYear(),
          month: startTime.getMonth() + 1,
          day: startTime.getDate(),
          hour: startTime.getHours(),
          minute: startTime.getMinutes()
        });
        console.log('  Start (ISO):', startTime.toISOString());
        console.log('  End (local):', endTime.toString());
        console.log('  End (ISO):', endTime.toISOString());
      } catch (dateErr) {
        console.error('Error parsing dates:', dateErr);
        console.error('Parsed data:', parsedData);
        return {
          type: 'event',
          success: false,
          message: "I had trouble understanding the date and time. Could you please be more specific? For example: 'Schedule meeting tomorrow at 2pm' or 'Add event: Doctor appointment on December 15th at 10am'"
        };
      }

      let newEvent;
      
      // If userId is provided, use database Event model
      if (userId) {
        try {
          newEvent = await Event.create(userId, {
            summary: parsedData.summary.trim(),
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            category: parsedData.category || 'work',
            location: null,
            description: null,
            source: 'chat'
          });
          console.log('✅ Event created in database:', newEvent);
        } catch (dbErr) {
          console.error('Database error creating event:', dbErr);
          // Fallback to file-based storage
          console.log('Falling back to file-based Calendar storage');
          newEvent = await Calendar.createEvent({
            summary: parsedData.summary.trim(),
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            category: parsedData.category || 'work'
          });
        }
      } else {
        // No userId, use file-based storage
        newEvent = await Calendar.createEvent({
          summary: parsedData.summary.trim(),
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          category: parsedData.category || 'work'
        });
      }

      console.log('Event created successfully:', newEvent);
      return {
        type: 'event',
        success: true,
        message: `Event "${parsedData.summary.trim()}" has been added to your calendar!`,
        data: newEvent
      };
    } catch (err) {
      console.error('Error creating event:', err);
      console.error('Error stack:', err.stack);
      return {
        type: 'event',
        success: false,
        message: `I couldn't create the event: ${err.message || 'Unknown error'}. Could you please rephrase? For example: 'Schedule meeting tomorrow at 2pm'`
      };
    }
  },

  /**
   * Create a goal or habit from natural language
   * @param {string} prompt - User message
   * @returns {Promise<Object>} - Action result with success status and message
   */
  async createGoal(prompt) {
    const parsePrompt = `Extract goal or habit details from this message: "${prompt}"

Extract:
- type: "goal" for long-term goals or "habit" for daily/weekly habits
- title: the goal/habit name/title (required)
- category: one of "work", "study", "personal", "leisure", "fitness", "health", "travel", "rest", or "work" as default
- target: the target or outcome (optional, e.g., "Run 5K", "Read 24 books")
- deadline: deadline in a readable format like "Dec 2025" or "June 2025" (optional)
- milestones: array of 2-4 milestone steps to achieve the goal (optional, extract from description if possible)

Examples:
- "add goal to learn Spanish" -> {"type": "goal", "title": "Learn Spanish", "category": "study", "target": null, "deadline": null, "milestones": []}
- "create habit of running daily" -> {"type": "habit", "title": "Run Daily", "category": "fitness", "target": null, "deadline": null, "milestones": []}
- "set goal to read 24 books by December 2025" -> {"type": "goal", "title": "Read 24 Books", "category": "leisure", "target": "24 books", "deadline": "Dec 2025", "milestones": []}
- "add goal to run a marathon with milestones: run 5K, run 10K, run half marathon" -> {"type": "goal", "title": "Run Marathon", "category": "fitness", "target": "Complete 26.2 miles", "deadline": null, "milestones": ["Run 5K", "Run 10K", "Run half marathon"]}

Respond with ONLY a JSON object in this exact format:
{"type": "goal"|"habit", "title": "goal title", "category": "work"|"study"|"personal"|"leisure"|"fitness"|"health"|"travel"|"rest", "target": "target description or null", "deadline": "deadline or null", "milestones": ["milestone1", "milestone2"] or []}`;

    try {
      const openaiClient = getOpenAI();
      if (!openaiClient) {
        throw new Error('OpenAI not configured');
      }
      
      const parseCompletion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const responseContent = parseCompletion.choices[0].message.content;
      console.log('OpenAI goal parsing response:', responseContent);
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseContent);
        console.log('Parsed goal data:', parsedData);
      } catch (parseErr) {
        console.error('Error parsing OpenAI JSON response:', parseErr);
        console.error('Response content:', responseContent);
        return {
          type: 'goal',
          success: false,
          message: "I had trouble understanding the goal format. Could you please rephrase? For example: 'Add goal to learn Spanish' or 'Create habit of running daily'"
        };
      }
      
      if (!parsedData.title || !parsedData.title.trim()) {
        console.log('Goal data missing title field:', parsedData);
        return {
          type: 'goal',
          success: false,
          message: "I'd be happy to add a goal or habit for you! Could you please tell me what it is? For example: 'Add goal to learn Spanish' or 'Create habit of running daily'"
        };
      }

      try {
        const newGoal = await Goal.create({
          type: parsedData.type || 'goal',
          title: parsedData.title.trim(),
          category: parsedData.category || 'work',
          target: parsedData.target || null,
          deadline: parsedData.deadline || null,
          milestones: Array.isArray(parsedData.milestones) 
            ? parsedData.milestones.filter(m => m && m.trim()).map(m => ({
                text: m.trim(),
                completed: false
              }))
            : [],
          progress: 0
        });

        return {
          type: 'goal',
          success: true,
          message: `${parsedData.type === 'habit' ? 'Habit' : 'Goal'} "${parsedData.title.trim()}" has been added!`,
          data: newGoal
        };
      } catch (createErr) {
        console.error('Error creating goal in database:', createErr);
        return {
          type: 'goal',
          success: false,
          message: `I understood the ${parsedData.type || 'goal'}, but couldn't save it: ${createErr.message || 'Database error'}. Please try again.`
        };
      }
    } catch (err) {
      console.error('Error parsing/creating goal:', err);
      console.error('Error stack:', err.stack);
      return {
        type: 'goal',
        success: false,
        message: "I couldn't understand the goal details. Could you please rephrase? For example: 'Add goal to learn Spanish' or 'Create habit of running daily'"
      };
    }
  },

  /**
   * Process chat message and create task/event/goal if needed
   * @param {string} prompt - User message
   * @param {number|null} userId - User ID if authenticated, null otherwise
   * @returns {Promise<Object|null>} - Action result or null if no action needed
   */
  async processAction(prompt, userId = null) {
    const intent = await this.detectIntent(prompt);
    
    if (intent === 'task') {
      // Check if the request has enough information
      const completeness = await this.checkTaskCompleteness(prompt);
      
      if (!completeness.hasEnoughInfo) {
        // Return a clarification request instead of trying to create
        return {
          type: 'task',
          success: false,
          message: "I'd be happy to add a task for you! Could you please tell me what the task is and when it's due? For example: 'Add task: Buy groceries tomorrow' or 'Remind me to call mom on Friday'",
          needsClarification: true
        };
      }
      
      // Has enough info, proceed to create
      return await this.createTask(prompt, userId);
    } else if (intent === 'event') {
      return await this.createEvent(prompt, userId);
    } else if (intent === 'goal') {
      return await this.createGoal(prompt);
    }
    
    return null; // No action needed
  }
};

module.exports = chatActionService;

