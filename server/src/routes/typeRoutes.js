const express = require('express');
const router = express.Router();
const typeController = require('../controllers/typeController');

// Get all types
router.get('/', typeController.getAllTypes);

// Create a new type
router.post('/', typeController.createType);

// Update a type
router.put('/:index', typeController.updateType);

// Delete a type
router.delete('/:index', typeController.deleteType);

module.exports = router; 