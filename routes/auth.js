const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateRegistration, validateLogin, checkValidation } = require('../utils/validation');

// POST /api/auth/register
router.post('/register', validateRegistration, checkValidation, authController.register);

// POST /api/auth/login
router.post('/login', validateLogin, checkValidation, authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
