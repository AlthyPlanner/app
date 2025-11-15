const { OpenAI } = require('openai');
const chatActionService = require('../services/chatActionService');

let openai;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (err) {
  console.error('Error initializing OpenAI:', err);
}

const chatController = {
  async handleChat(req, res) {
    console.log('handleChat called');
    let responseSent = false;
    
    const sendErrorResponse = (status, message) => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        try {
          res.status(status).json({ error: message });
        } catch (err) {
          console.error('Error sending error response:', err);
        }
      }
    };

    const sendSuccessResponse = (data) => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        try {
          res.json(data);
        } catch (err) {
          console.error('Error sending success response:', err);
        }
      }
    };

    try {
      console.log('Starting chat request processing');
      
      // Safely access req.body
      if (!req.body) {
        console.error('Request body is missing!');
        return sendErrorResponse(400, 'Request body is required');
      }
      
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers['content-type']);
      
      const { prompt, history = [], context = {} } = req.body;
      
      console.log('Received chat request:', { 
        hasPrompt: !!prompt, 
        promptLength: prompt ? prompt.length : 0,
        historyLength: Array.isArray(history) ? history.length : 0,
        hasContext: !!context,
        hasTodos: !!(context && context.todos),
        hasEvents: !!(context && context.events)
      });
      
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        console.error('Invalid prompt:', prompt);
        return sendErrorResponse(400, 'Prompt is required and must be a non-empty string.');
      }

      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
        console.error('OpenAI API key not configured');
        return sendErrorResponse(503, 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.');
      }

      // Step 1: Process action (task/event creation) if needed
      let actionResult = null;
      try {
        actionResult = await chatActionService.processAction(prompt);
        if (actionResult) {
          console.log('Action result:', JSON.stringify(actionResult, null, 2));
        }
      } catch (actionErr) {
        console.error('Error processing action:', actionErr);
        console.error('Action error stack:', actionErr.stack);
        // Continue to AI response even if action fails
      }

      // Step 2: Generate AI response
      let aiResponse = 'I apologize, but I encountered an error processing your request.';
      try {
        // Build context summary with defensive checks
        let contextSummary = '';
        try {
          if (context && Array.isArray(context.todos) && context.todos.length > 0) {
            const activeTodos = context.todos.filter(t => t && !t.completed);
            const completedTodos = context.todos.filter(t => t && t.completed);
            contextSummary += `\n\nCurrent Tasks:\n`;
            if (activeTodos.length > 0) {
              contextSummary += `Active tasks (${activeTodos.length}):\n`;
              activeTodos.slice(0, 5).forEach(todo => {
                if (todo && todo.text) {
                  contextSummary += `- ${todo.text}`;
                  if (todo.due) contextSummary += ` (due: ${todo.due})`;
                  if (todo.priority && todo.priority !== 'none') contextSummary += ` [${todo.priority} priority]`;
                  if (todo.category) contextSummary += ` [${todo.category}]`;
                  contextSummary += '\n';
                }
              });
              if (activeTodos.length > 5) {
                contextSummary += `... and ${activeTodos.length - 5} more active tasks\n`;
              }
            }
            if (completedTodos.length > 0) {
              contextSummary += `Completed tasks: ${completedTodos.length}\n`;
            }
          }
          
          if (context && Array.isArray(context.events) && context.events.length > 0) {
            contextSummary += `\nUpcoming Events (${context.events.length}):\n`;
            context.events.slice(0, 5).forEach(event => {
              if (event && event.summary) {
                try {
                  const startDate = event.start ? new Date(event.start).toLocaleDateString() : 'TBD';
                  contextSummary += `- ${event.summary} (${startDate})`;
                  if (event.category) contextSummary += ` [${event.category}]`;
                  contextSummary += '\n';
                } catch (dateErr) {
                  contextSummary += `- ${event.summary}\n`;
                }
              }
            });
            if (context.events.length > 5) {
              contextSummary += `... and ${context.events.length - 5} more events\n`;
            }
          }
        } catch (contextErr) {
          console.error('Error building context summary:', contextErr);
          // Continue without context if there's an error
        }

        // Build system prompt with context
        const systemPrompt = `You are Althy, an AI personal planning assistant. Your job is to help the user manage their time, tasks, plans, and goals in a clear and structured way.

Core responsibilities:

1. Add, edit, or summarize tasks.

2. Create daily or weekly plans that fit the user's schedule.

3. Break goals into actionable milestones.

4. Maintain lifestyle balance across categories: Work, Study, Personal, Leisure, Fitness, Health, Travel, Rest.

5. Ask concise follow-up questions if the user's request is incomplete (e.g., missing time, duration, or due date).

6. Keep responses short, direct, and helpful.

7. When outputting tasks, plans, or goals, use structured formatting (lists or bullets) for easier parsing.

Behavior:

- Be friendly, supportive, and efficient.

- Never overwhelm the user—provide only what's relevant.

- When scheduling, always consider workload, time constraints, and rest balance.

- If the user seems overloaded, gently suggest rest or lighter planning.

- When the user gives new data (e.g., time availability, deadlines), incorporate it immediately.

Output style:

- Use simple language.

- Keep each response under 6–8 sentences unless the user explicitly asks for more.

- For action items, use a clear bullet list.

Your goal is to help the user stay productive, healthy, and balanced with minimal friction.${contextSummary}`;

        // Build messages array with history
        const messages = [
          { role: 'system', content: systemPrompt }
        ];

        // Add chat history (limit to last 10 messages to avoid token limits)
        try {
          if (Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-10);
            recentHistory.forEach(msg => {
              if (msg && msg.role && msg.content) {
                messages.push({
                  role: msg.role,
                  content: msg.content
                });
              }
            });
          }
        } catch (historyErr) {
          console.error('Error processing chat history:', historyErr);
          // Continue without history if there's an error
        }

        // Add current user message
        messages.push({ role: 'user', content: prompt });

        if (!openai) {
          // Try to initialize if not already done
          if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
            openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          } else {
            throw new Error('OpenAI client not initialized - API key not configured');
          }
        }
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages
        });
        aiResponse = completion.choices[0].message.content;
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
        // If we already created a task/event, still return success with action
        if (actionResult && actionResult.success) {
          aiResponse = 'I\'ve processed your request.';
        } else {
          aiResponse = `I encountered an error: ${aiError.message || 'Unable to generate response'}. Please try again.`;
        }
      }
      
      sendSuccessResponse({ 
        response: aiResponse,
        action: actionResult // Include action result if any
      });
    } catch (error) {
      console.error('Chat Controller error:', error);
      console.error('Error stack:', error.stack);
      // Make sure we always send a response, even on unexpected errors
      try {
        sendErrorResponse(500, error.message || 'An unexpected error occurred');
      } catch (responseErr) {
        console.error('Failed to send error response:', responseErr);
        // Last resort - try to send a basic response
        if (!responseSent) {
          try {
            res.status(500).json({ error: 'An unexpected error occurred' });
          } catch (finalErr) {
            console.error('Failed to send final error response:', finalErr);
          }
        }
      }
    }
  }
};

module.exports = chatController;

