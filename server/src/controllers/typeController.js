const Type = require('../models/Type');

const typeController = {
  // Get all types
  async getAllTypes(req, res) {
    try {
      const types = await Type.getAll();
      res.json({ types });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read types' });
    }
  },

  // Create a new type
  async createType(req, res) {
    try {
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Type name is required' });
      }
      
      const newType = await Type.create({ name });
      res.json({ message: 'Type added successfully', type: newType });
    } catch (error) {
      console.error('Error adding type:', error);
      res.status(500).json({ error: 'Failed to add type' });
    }
  },

  // Update a type
  async updateType(req, res) {
    try {
      const { index } = req.params;
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Type name is required' });
      }
      
      const updatedType = await Type.update(parseInt(index), { name });
      res.json({ message: 'Type updated successfully', type: updatedType });
    } catch (error) {
      if (error.message === 'Type not found') {
        return res.status(404).json({ error: 'Type not found' });
      }
      res.status(500).json({ error: 'Failed to update type' });
    }
  },

  // Delete a type
  async deleteType(req, res) {
    try {
      const { index } = req.params;
      const result = await Type.delete(parseInt(index));
      res.json(result);
    } catch (error) {
      if (error.message === 'Type not found') {
        return res.status(404).json({ error: 'Type not found' });
      }
      res.status(500).json({ error: 'Failed to delete type' });
    }
  }
};

module.exports = typeController; 