const { Job, Booking, Model } = require('../models');

/**
 * Create a new job posting
 */
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      client_name,
      client_contact,
      job_date,
      location,
      payment,
      requirements
    } = req.body;

    // Validate required fields
    if (!title || !description || !client_name || !job_date || !location || !payment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const job = await Job.create({
      title,
      description,
      client_name,
      client_contact,
      job_date,
      location,
      payment: parseFloat(payment),
      requirements,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all jobs with filters
 */
exports.getJobs = async (req, res) => {
  try {
    const { status, search, limit } = req.query;

    let jobs = await Job.findAll();

    // Filter by status
    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    // Search by title or client name
    if (search) {
      const searchLower = search.toLowerCase();
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(searchLower) ||
        j.client_name.toLowerCase().includes(searchLower)
      );
    }

    // Limit results
    if (limit) {
      jobs = jobs.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get job detail with bookings
 */
exports.getJobDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get bookings for this job
    const bookings = await Booking.findByJobId(id);

    // Get model details for each booking
    const bookingsWithModels = await Promise.all(
      bookings.map(async (booking) => {
        const model = await Model.findById(booking.model_id);
        return {
          ...booking,
          model: model ? {
            model_id: model.model_id,
            full_name: model.full_name,
            rate: model.rate
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        job,
        bookings: bookingsWithModels
      }
    });
  } catch (error) {
    console.error('Get job detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Apply to a job (model)
 */
exports.applyToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Only models can apply to jobs'
      });
    }

    // Check if job exists
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job is still open
    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Job is no longer accepting applications'
      });
    }

    // Check if model is active
    const model = await Model.findById(modelId);
    if (!model || model.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your profile must be active to apply to jobs'
      });
    }

    // Check if already applied
    const existingBooking = await Booking.findByJobAndModel(id, modelId);
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job'
      });
    }

    // Create booking
    const booking = await Booking.create({
      job_id: id,
      model_id: modelId,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: booking
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get model's bookings
 */
exports.getMyBookings = async (req, res) => {
  try {
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Only models can view bookings'
      });
    }

    const bookings = await Booking.findByModelId(modelId);

    // Get job details for each booking
    const bookingsWithJobs = await Promise.all(
      bookings.map(async (booking) => {
        const job = await Job.findById(booking.job_id);
        return {
          ...booking,
          job
        };
      })
    );

    res.json({
      success: true,
      data: bookingsWithJobs
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update booking status (admin)
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await Booking.update(id, { status });

    // If booking is confirmed, update job status
    if (status === 'confirmed') {
      await Job.update(booking.job_id, { status: 'booked' });
    }

    const updatedBooking = await Booking.findById(id);

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update job status (admin)
 */
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'booked', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await Job.update(id, { status });

    const updatedJob = await Job.findById(id);

    res.json({
      success: true,
      message: 'Job status updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
