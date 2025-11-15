const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiController = {
  async generateResponse(req, res) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      // Check if OpenAI is configured
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
        return res.status(503).json({ 
          error: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.' 
        });
      }

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
      
      res.json({ 
        response: completion.choices[0].message.content
      });
    } catch (error) {
      console.error('OpenAI API error:', error);
      res.status(500).json({ error: error.message || 'OpenAI API error' });
    }
  }
};

module.exports = openaiController; 