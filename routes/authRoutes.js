const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const protect = require('../middleware/auth');
const { registerRules, loginRules } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes (with rate limiting)
router.post('/register', authLimiter, registerRules, register);
router.post('/login', authLimiter, loginRules, login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
