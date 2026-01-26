const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { auth, isAdmin, isModel } = require('../middleware/auth');

// POST /api/jobs - Create new job (admin only)
router.post('/', auth, isAdmin, jobController.createJob);

// GET /api/jobs - Get all jobs (public and models)
router.get('/', jobController.getJobs);

// GET /api/jobs/:id - Get job by ID
router.get('/:id', jobController.getJobById);

// POST /api/jobs/:id/apply - Apply for job (model only)
router.post('/:id/apply', auth, isModel, jobController.applyForJob);

// GET /api/jobs/my-bookings - Get model's bookings (model only)
router.get('/my-bookings', auth, isModel, jobController.getMyBookings);

module.exports = router;
