const express = require('express');
const router = express.Router();
const { generateCode } = require('../controllers/codecontroller');

// POST /api/code/generate
router.post('/generate', generateCode);

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Code API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;