const Email = require('../models/Email');

const addEmail = async (req, res) => {
  try {
    const { email, source, name, organization, message } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const emailData = {
      email: email.trim(),
      source: source || 'unknown',
      name,
      organization,
      message
    };

    const savedEmail = await Email.addEmail(emailData);
    res.status(201).json({ 
      success: true, 
      message: 'Email saved successfully',
      email: savedEmail 
    });
  } catch (error) {
    console.error('Error adding email:', error);
    if (error.message.includes('DATABASE_URL')) {
      res.status(503).json({ 
        error: 'Database not configured. Please add PostgreSQL to Railway and set DATABASE_URL.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to save email: ' + error.message });
    }
  }
};

const getAllEmails = async (req, res) => {
  try {
    const emails = await Email.getAll();
    res.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
};

module.exports = {
  addEmail,
  getAllEmails
};

