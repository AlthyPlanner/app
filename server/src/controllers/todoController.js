const Todo = require('../models/Todo');

const todoController = {
  // Get all todos
  async getAllTodos(req, res) {
    try {
      const todos = await Todo.getAll();
      res.json({ todos });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read todos' });
    }
  },

  // Create a new todo
  async createTodo(req, res) {
    try {
      const { todo, due, type } = req.body;
      
      if (!todo || !todo.trim()) {
        return res.status(400).json({ error: 'Todo text is required' });
      }
      
      const newTodo = await Todo.create({ todo, due, type });
      res.json({ message: 'Todo added successfully', todo: newTodo });
    } catch (error) {
      console.error('Error adding todo:', error);
      res.status(500).json({ error: 'Failed to add todo' });
    }
  },

  // Update a todo
  async updateTodo(req, res) {
    try {
      const { index } = req.params;
      const { todo, due, type } = req.body;
      
      if (!todo || !todo.trim()) {
        return res.status(400).json({ error: 'Todo text is required' });
      }
      
      const updatedTodo = await Todo.update(parseInt(index), { todo, due, type });
      res.json({ message: 'Todo updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'Todo not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.status(500).json({ error: 'Failed to update todo' });
    }
  },

  // Toggle completion status
  async toggleTodo(req, res) {
    try {
      const { index } = req.params;
      const updatedTodo = await Todo.toggle(parseInt(index));
      res.json({ message: 'Todo status updated successfully', todo: updatedTodo });
    } catch (error) {
      if (error.message === 'Todo not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.status(500).json({ error: 'Failed to update todo status' });
    }
  },

  // Delete a todo
  async deleteTodo(req, res) {
    try {
      const { index } = req.params;
      const result = await Todo.delete(parseInt(index));
      res.json(result);
    } catch (error) {
      if (error.message === 'Todo not found') {
        return res.status(404).json({ error: 'Todo not found' });
      }
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  }
};

module.exports = todoController; 