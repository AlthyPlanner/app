const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');

// Get all goals
router.get('/', goalController.getAllGoals);

// Create a new goal
router.post('/', goalController.createGoal);

// Update milestone status (must come before /:id routes)
router.patch('/:id/milestones/:milestoneId/toggle', goalController.toggleMilestone);

// Get goal by ID
router.get('/:id', goalController.getGoalById);

// Update a goal
router.put('/:id', goalController.updateGoal);

// Delete a goal
router.delete('/:id', goalController.deleteGoal);

module.exports = router;

