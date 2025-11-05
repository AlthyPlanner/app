const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');

// Get all todos
router.get('/', todoController.getAllTodos);

// Create a new todo
router.post('/', todoController.createTodo);

// Toggle completion status
router.patch('/:index/toggle', todoController.toggleTodo);

// Update a todo
router.put('/:index', todoController.updateTodo);

// Delete a todo
router.delete('/:index', todoController.deleteTodo);

module.exports = router; 