const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiController = {
  async generateResponse(req, res) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      });
      
      res.json({ response: completion.choices[0].message.content });
    } catch (error) {
      res.status(500).json({ error: error.message || 'OpenAI API error' });
    }
  }
};

module.exports = openaiController; 