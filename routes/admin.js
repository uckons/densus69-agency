const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(auth, isAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/models - Get all models
router.get('/models', adminController.getModels);

// GET /api/admin/models/:id - Get model by ID
router.get('/models/:id', adminController.getModelById);

// PUT /api/admin/models/:id/status - Update model status
router.put('/models/:id/status', adminController.updateModelStatus);

// PUT /api/admin/models/:id/rate - Update model rate
router.put('/models/:id/rate', adminController.updateModelRate);

// GET /api/admin/analytics - Get analytics data
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
