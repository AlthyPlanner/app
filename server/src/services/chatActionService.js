const { OpenAI } = require('openai');
const Todo = require('../models/Todo');
const Calendar = require('../models/Calendar');

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
3. Just chat (anything else)

User message: "${prompt}"

Respond with ONLY one word: "task", "event", or "chat"`;

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
   * @returns {Promise<Object>} - Action result with success status and message
   */
  async createTask(prompt) {
    const parsePrompt = `Extract task details from this message: "${prompt}"

Extract:
- todo: the task title/description (required). Include the full task description. For example, "add task of running 1 mile tomorrow at 8am" should extract "running 1 mile" as the todo.
- due: due date in YYYY-MM-DD format or null if not specified (look for: today, tomorrow, dates like 12/15/2024). If a time is mentioned (like "8am"), use just the date, ignore the time.
- priority: "high", "low", or "none" (look for words like urgent, important, high priority, or low priority)
- category: one of "work", "study", "personal", "leisure", "fitness", "health", "travel", "rest", or empty string. Infer from the task description if possible (e.g., "running" -> "fitness", "study" -> "study", "meeting" -> "work")

Examples:
- "add task of running 1 mile tomorrow at 8am" -> {"todo": "running 1 mile", "due": "tomorrow", "priority": "none", "category": "fitness"}
- "add task: buy groceries" -> {"todo": "buy groceries", "due": null, "priority": "none", "category": "personal"}

Respond with ONLY a JSON object in this exact format:
{"todo": "task title", "due": "2024-12-15" or null, "priority": "high"|"low"|"none", "category": "work"|"study"|"personal"|"leisure"|"fitness"|"health"|"travel"|"rest"|""}`;

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

      // Convert "today" and "tomorrow" to actual dates
      let dueDate = parsedData.due;
      if (dueDate && typeof dueDate === 'string') {
        const today = new Date();
        if (dueDate.toLowerCase() === 'today') {
          dueDate = today.toISOString().split('T')[0];
        } else if (dueDate.toLowerCase() === 'tomorrow') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        }
      }

      try {
        const newTodo = await Todo.create({
          todo: parsedData.todo.trim(),
          due: dueDate || null,
          category: parsedData.category || '',
          priority: parsedData.priority || 'none'
        });

        return {
          type: 'task',
          success: true,
          message: `Task "${parsedData.todo.trim()}" has been added!`,
          data: newTodo
        };
      } catch (createErr) {
        console.error('Error creating task in database:', createErr);
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
   * @returns {Promise<Object>} - Action result with success status and message
   */
  async createEvent(prompt) {
    const parsePrompt = `Extract calendar event details from this message: "${prompt}"

Extract:
- summary: the event title/name (required)
- start: start date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). If only date is given, use 9:00 AM. If only time is given, use today's date.
- end: end date and time in ISO 8601 format. If not specified, make it 1 hour after start.
- category: one of "work", "study", "personal", "leisure", "fitness", "health", "travel", "rest", or "work" as default

Parse dates like:
- "today at 2pm" -> today's date at 14:00
- "tomorrow at 10am" -> tomorrow's date at 10:00
- "12/15/2024 at 3pm" -> 2024-12-15T15:00:00Z
- "2pm to 4pm" -> today at 14:00 to 16:00

Current date/time context: ${new Date().toISOString()}

Respond with ONLY a JSON object in this exact format:
{"summary": "event title", "start": "2024-12-15T14:00:00Z", "end": "2024-12-15T15:00:00Z", "category": "work"|"study"|"personal"|"leisure"|"fitness"|"health"|"travel"|"rest"}`;

    try {
      const parseCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: parsePrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const parsedData = JSON.parse(parseCompletion.choices[0].message.content);
      
      if (!parsedData.summary || !parsedData.summary.trim()) {
        return {
          type: 'event',
          success: false,
          message: "I'd be happy to schedule an event for you! Could you please tell me what the event is and when? For example: 'Schedule meeting with team tomorrow at 2pm' or 'Add event: Doctor appointment on 12/15/2024 at 10am'"
        };
      }

      // Ensure we have valid start and end times
      const startTime = parsedData.start ? new Date(parsedData.start) : new Date();
      const endTime = parsedData.end ? new Date(parsedData.end) : new Date(startTime.getTime() + 3600000); // Default 1 hour

      // Validate times
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
        endTime.setTime(startTime.getTime() + 3600000); // Default 1 hour if invalid
      }

      const newEvent = await Calendar.createEvent({
        summary: parsedData.summary.trim(),
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        category: parsedData.category || 'work'
      });

      return {
        type: 'event',
        success: true,
        message: `Event "${parsedData.summary.trim()}" has been added to your calendar!`,
        data: newEvent
      };
    } catch (err) {
      console.error('Error creating event:', err);
      return {
        type: 'event',
        success: false,
        message: "I couldn't understand the event details. Could you please rephrase? For example: 'Schedule meeting tomorrow at 2pm'"
      };
    }
  },

  /**
   * Process chat message and create task/event if needed
   * @param {string} prompt - User message
   * @returns {Promise<Object|null>} - Action result or null if no action needed
   */
  async processAction(prompt) {
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
      return await this.createTask(prompt);
    } else if (intent === 'event') {
      return await this.createEvent(prompt);
    }
    
    return null; // No action needed
  }
};

module.exports = chatActionService;

