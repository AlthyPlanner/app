const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');

// Get all goals
router.get('/', goalController.getAllGoals);

// Get a single goal
router.get('/:id', goalController.getGoal);

// Create a new goal
router.post('/', goalController.createGoal);

// Update a goal
router.put('/:id', goalController.updateGoal);

// Delete a goal
router.delete('/:id', goalController.deleteGoal);

module.exports = router;


