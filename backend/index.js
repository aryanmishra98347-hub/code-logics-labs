require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const codeRoutes = require('./routes/code');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware - helmet adds various HTTP headers for security
app.use(helmet());

// CORS Configuration - IMPORTANT SECURITY FIX
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://code-logics-labs-frontend.onrender.com',
            'http://localhost:5500',
            'http://localhost:3000',
            'http://127.0.0.1:5500'
        ];
        
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting - Prevent API abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Stricter rate limiting for code generation endpoint
const generateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit to 10 requests per minute
    message: {
        error: 'Too many code generation requests. Please wait a minute before trying again.'
    }
});

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/code', codeRoutes);

// Apply stricter rate limiting to generate endpoint
app.use('/api/code/generate', generateLimiter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: 'The requested resource was not found on this server.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error for debugging (in production, use a proper logging service)
    console.error('Error:', err.message);
    
    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
            error: 'CORS Error',
            message: 'Origin not allowed'
        });
    }
    
    // Handle other errors
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
========================================
🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔒 CORS: Enabled with restrictions
⏱️  Rate Limiting: Active
========================================
    `);
});

module.exports = app;