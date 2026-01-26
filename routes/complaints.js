const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { auth, isAdmin } = require('../middleware/auth');
const { validateComplaint, checkValidation } = require('../utils/validation');

// POST /api/complaints - Submit new complaint (public)
router.post('/', validateComplaint, checkValidation, complaintController.createComplaint);

// GET /api/complaints - Get all complaints (admin only)
router.get('/', auth, isAdmin, complaintController.getComplaints);

// GET /api/complaints/:id - Get complaint by ID
router.get('/:id', complaintController.getComplaintById);

// PUT /api/complaints/:id/resolve - Resolve complaint (admin only)
router.put('/:id/resolve', auth, isAdmin, complaintController.resolveComplaint);

// POST /api/complaints/:id/response - Add response to complaint
router.post('/:id/response', auth, complaintController.addResponse);

module.exports = router;
