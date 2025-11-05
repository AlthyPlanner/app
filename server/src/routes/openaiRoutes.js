const express = require('express');
const router = express.Router();
const openaiController = require('../controllers/openaiController');

// Generate AI response
router.post('/', openaiController.generateResponse);

module.exports = router; 