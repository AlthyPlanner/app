const Goal = require('../models/Goal');

const goalController = {
  // Get all goals
  async getAllGoals(req, res) {
    try {
      const goals = await Goal.getAll();
      res.json({ goals });
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ error: 'Failed to fetch goals' });
    }
  },

  // Get goal by ID
  async getGoalById(req, res) {
    try {
      const { id } = req.params;
      const goal = await Goal.getById(id);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      res.json({ goal });
    } catch (error) {
      console.error('Error fetching goal:', error);
      res.status(500).json({ error: 'Failed to fetch goal' });
    }
  },

  // Create a new goal
  async createGoal(req, res) {
    try {
      const { type, title, category, target, deadline, milestones, progress } = req.body;
      
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Goal title is required' });
      }
      
      const newGoal = await Goal.create({ 
        type: type || 'goal',
        title, 
        category: category || 'work',
        target, 
        deadline, 
        milestones: milestones || [],
        progress: progress || 0
      });
      res.json({ message: 'Goal created successfully', goal: newGoal });
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  },

  // Update a goal
  async updateGoal(req, res) {
    try {
      const { id } = req.params;
      const { type, title, category, target, deadline, milestones, progress } = req.body;
      
      const updatedGoal = await Goal.update(id, { 
        type, 
        title, 
        category, 
        target, 
        deadline, 
        milestones, 
        progress 
      });
      res.json({ message: 'Goal updated successfully', goal: updatedGoal });
    } catch (error) {
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
      const { id } = req.params;
      const result = await Goal.delete(id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Goal not found') {
        return res.status(404).json({ error: 'Goal not found' });
      }
      console.error('Error deleting goal:', error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  },

  // Update milestone status
  async updateMilestone(req, res) {
    try {
      const { goalId, milestoneId } = req.params;
      const { completed } = req.body;
      
      const updatedGoal = await Goal.updateMilestone(goalId, milestoneId, completed);
      res.json({ message: 'Milestone updated successfully', goal: updatedGoal });
    } catch (error) {
      if (error.message === 'Goal not found' || error.message === 'Milestone not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error updating milestone:', error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  },

  // Toggle milestone status
  async toggleMilestone(req, res) {
    try {
      const { id, milestoneId } = req.params;
      const goal = await Goal.getById(id);
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      const milestone = goal.milestones.find(m => m.id == milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }
      
      const newCompletedStatus = !milestone.completed;
      const updatedGoal = await Goal.updateMilestone(id, milestoneId, newCompletedStatus);
      res.json({ message: 'Milestone toggled successfully', goal: updatedGoal });
    } catch (error) {
      if (error.message === 'Goal not found' || error.message === 'Milestone not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error toggling milestone:', error);
      res.status(500).json({ error: 'Failed to toggle milestone' });
    }
  }
};

module.exports = goalController;

