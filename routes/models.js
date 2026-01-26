const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const { auth, isModel } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
// GET /api/models/public/gallery - Get public gallery
router.get('/public/gallery', modelController.getPublicGallery);

// GET /api/models/public/:id - Get public model profile
router.get('/public/:id', modelController.getPublicModelProfile);

// Protected routes (model only)
// GET /api/models/profile - Get own profile
router.get('/profile', auth, isModel, modelController.getProfile);

// PUT /api/models/profile - Update own profile
router.put('/profile', auth, isModel, modelController.updateProfile);

// GET /api/models/dashboard - Get model dashboard
router.get('/dashboard', auth, isModel, modelController.getDashboard);

// POST /api/models/photos - Upload photos
router.post('/photos', auth, isModel, upload.array('photos', 10), modelController.uploadPhotos);

// DELETE /api/models/photos/:id - Delete photo
router.delete('/photos/:id', auth, isModel, modelController.deletePhoto);

module.exports = router;
