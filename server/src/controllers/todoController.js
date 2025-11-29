const Task = require('../models/Task');

// Middleware to get user_id from session
const getUserId = (req) => {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
};

const todoController = {
  // Get all todos
  async getAllTodos(req, res) {
    try {
      const userId = getUserId(req);
      const todos = await Task.getAll(userId);
      res.json({ todos });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.error('Error fetching todos:', error);
      res.status(500).json({ error: 'Failed to read todos' });
    }
  },

  // Create a new todo
  async createTodo(req, res) {
    try {
      const userId = getUserId(req);
      const { todo, due, type, category, goal, priority, status, description } = req.body;
      
      if (!todo || !todo.trim()) {
        return res.status(400).json({ error: 'Todo text is required' });
      }
      
      const newTodo = await Task.create(userId, { todo, due, type, category, goal, priority, status, description });
      res.json({ message: 'Todo added successfully', todo: newTodo });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      console.error('Error adding todo:', error);
      res.status(500).json({ error: 'Failed to add todo' });
    }
  },

  // Update a todo
  async updateTodo(req, res) {
    try {
      const userId = getUserId(req);
      const { index } = req.params;
      const { todo, due, type, category, goal, priority, status, description } = req.body;
      
      if (todo !== undefined && !todo.trim()) {
        return res.status(400).json({ error: 'Todo text cannot be empty' });
      }
      
      const updateData = {};
      if (todo !== undefined) updateData.todo = todo;
      if (due !== undefined) updateData.due = due;
      if (type !== undefined) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (goal !== undefined) updateData.goal = goal;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (description !== undefined) updateData.description = description;
      
      const updatedTodo = await Task.update(parseInt(index), userId, updateData);
      res.json({ message: 'Todo updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      console.error('Error updating todo:', error);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  },

  // Toggle completion status
  async toggleTodo(req, res) {
    try {
      const userId = getUserId(req);
      const { index } = req.params;
      const updatedTodo = await Task.toggle(parseInt(index), userId);
      res.json({ message: 'Todo status updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      console.error('Error toggling todo:', error);
      res.status(500).json({ error: 'Failed to update todo status' });
    }
  },

  // Update task status (complete, in_progress, forward)
  async updateStatus(req, res) {
    try {
      const userId = getUserId(req);
      const { index } = req.params;
      const { status, due } = req.body;
      
      if (!['complete', 'in_progress', 'forward', null, ''].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const updateData = { status: status || null };
      // If due date is provided (e.g., when forwarding), include it
      if (due !== undefined) {
        updateData.due = due;
      }
      
      const updatedTodo = await Task.update(parseInt(index), userId, updateData);
      res.json({ message: 'Task status updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  },

  // Update priority
  async updatePriority(req, res) {
    try {
      const userId = getUserId(req);
      const { index } = req.params;
      const { priority } = req.body;
      
      if (!['none', 'low', 'high', null, ''].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      
      const updatedTodo = await Task.update(parseInt(index), userId, { priority: priority || 'none' });
      res.json({ message: 'Priority updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      console.error('Error updating priority:', error);
      res.status(500).json({ error: 'Failed to update priority' });
    }
  },

  // Delete a todo
  async deleteTodo(req, res) {
    try {
      const userId = getUserId(req);
      const { index } = req.params;
      const result = await Task.delete(parseInt(index), userId);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not authenticated') {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      console.error('Error deleting todo:', error);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  }
};

module.exports = todoController; 