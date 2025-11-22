const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Add email to waiting list
router.post('/', emailController.addEmail);

// Get all emails (for admin purposes - you might want to add authentication)
router.get('/', emailController.getAllEmails);

module.exports = router;

