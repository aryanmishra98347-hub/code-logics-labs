const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { generateCode } = require('../controllers/codecontroller');

// Input validation middleware
const validatePrompt = [
    body('prompt')
        .trim()
        .notEmpty().withMessage('Prompt is required')
        .isLength({ min: 3, max: 5000 }).withMessage('Prompt must be between 3 and 5000 characters')
        .matches(/^[a-zA-Z0-9\s\.,!?;:()\[\]{}'"\-_+=*\/\\<>@#$%&]*$/).withMessage('Prompt contains invalid characters')
        .escape(), // Prevent XSS attacks
];

// POST /api/code/generate - Generate code based on prompt
router.post('/generate', validatePrompt, async (req, res, next) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation Error',
                details: errors.array() 
            });
        }

        // Call the controller
        await generateCode(req, res);
    } catch (error) {
        next(error);
    }
});

// Health check for code API
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Code API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;