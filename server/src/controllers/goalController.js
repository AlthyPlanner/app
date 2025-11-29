const Goal = require('../models/Goal');

// Middleware to get user_id from session
const getUserId = (req) => {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
};

const goalController = {
  // Get all goals
  async getAllGoals(req, res) {
    try {
      const userId = getUserId(req);
      const goals = await Goal.getAll(userId);
      res.json({ goals });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.error('Error fetching goals:', error);
      res.status(500).json({ error: 'Failed to read goals' });
    }
  },

  // Get a single goal
  async getGoal(req, res) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const goal = await Goal.getById(parseInt(id), userId);
      res.json({ goal });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Goal not found') {
        return res.status(404).json({ error: 'Goal not found' });
      }
      console.error('Error fetching goal:', error);
      res.status(500).json({ error: 'Failed to read goal' });
    }
  },

  // Create a new goal
  async createGoal(req, res) {
    try {
      const userId = getUserId(req);
      const { title, description, category, target, deadline, milestones } = req.body;
      
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      const newGoal = await Goal.create(userId, {
        title,
        description,
        category,
        target,
        deadline,
        milestones: milestones || []
      });
      res.json({ message: 'Goal created successfully', goal: newGoal });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.error('Error creating goal:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  },

  // Update a goal
  async updateGoal(req, res) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { title, description, category, target, deadline, progress, status, milestones } = req.body;
      
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (target !== undefined) updateData.target = target;
      if (deadline !== undefined) updateData.deadline = deadline;
      if (progress !== undefined) updateData.progress = progress;
      if (status !== undefined) updateData.status = status;
      if (milestones !== undefined) updateData.milestones = milestones;
      
      const updatedGoal = await Goal.update(parseInt(id), userId, updateData);
      res.json({ message: 'Goal updated successfully', goal: updatedGoal });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Goal not found') {
        return res.status(404).json({ error: 'Goal not found' });
      }
      console.error('Error updating goal:', error);
      res.status(500).json({ error: 'Failed to update goal' });
    }
  },

  // Delete a goal
  async deleteGoal(req, res) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const result = await Goal.delete(parseInt(id), userId);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Goal not found') {
        return res.status(404).json({ error: 'Goal not found' });
      }
      console.error('Error deleting goal:', error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  }
};

module.exports = goalController;


