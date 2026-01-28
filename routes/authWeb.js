const express = require('express');
const router = express.Router();
const authWebController = require('../controllers/authWebController');

// GET /auth/register - Show registration form
router.get('/register', authWebController.showRegister);

// POST /auth/register - Handle registration
router.post('/register', authWebController.register);

// GET /auth/login - Show login form
router.get('/login', authWebController.showLogin);

// POST /auth/login - Handle login
router.post('/login', authWebController.login);

// GET /auth/logout - Handle logout
router.get('/logout', authWebController.logout);

module.exports = router;
