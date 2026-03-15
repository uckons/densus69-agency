const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(auth, isAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/model-grades
router.get('/model-grades', adminController.getModelGrades);

// POST /api/admin/model-grades
router.post('/model-grades', adminController.createModelGrade);

// PUT /api/admin/model-grades/:id
router.put('/model-grades/:id', adminController.updateModelGrade);

// DELETE /api/admin/model-grades/:id
router.delete('/model-grades/:id', adminController.deleteModelGrade);

// GET /api/admin/models - Get all models
router.get('/models', adminController.getModels);

// POST /api/admin/models/manual - Create model manually and bind agent
router.post('/models/manual', adminController.createManualModel);
router.put('/models/manual/:id', adminController.updateManualModel);

// GET /api/admin/models/:id - Get model by ID
router.get('/models/:id', adminController.getModelDetail);

// PUT /api/admin/models/:id/status - Update model status
router.put('/models/:id/status', adminController.updateModelStatus);

// PUT /api/admin/models/:id/rate - Update model rate
router.put('/models/:id/rate', adminController.updateModelRate);

// DELETE /api/admin/models/:id - Delete model
router.delete('/models/:id', adminController.deleteModel);

// GET /api/admin/analytics - Get analytics data
router.get('/analytics', adminController.getRevenueAnalytics);

module.exports = router;
