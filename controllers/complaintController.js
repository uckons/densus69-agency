const { Complaint, Model, User } = require('../models');

/**
 * Create a new complaint
 */
exports.createComplaint = async (req, res) => {
  try {
    const {
      subject,
      description,
      priority
    } = req.body;

    // Validate required fields
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required'
      });
    }

    // Get model_id if user is a model
    let modelId = null;
    if (req.user.role === 'model' && req.user.model_id) {
      modelId = req.user.model_id;
    }

    const complaint = await Complaint.create({
      model_id: modelId,
      user_id: req.user.user_id,
      subject,
      description,
      priority: priority || 'medium',
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all complaints with filters
 */
exports.getComplaints = async (req, res) => {
  try {
    const { status, priority, model_id } = req.query;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    let complaints = await Complaint.findAll();

    // If user is a model, only show their complaints
    if (userRole === 'model') {
      complaints = complaints.filter(c => c.user_id === userId);
    }

    // Filter by status
    if (status) {
      complaints = complaints.filter(c => c.status === status);
    }

    // Filter by priority
    if (priority) {
      complaints = complaints.filter(c => c.priority === priority);
    }

    // Filter by model_id (admin only)
    if (model_id && userRole === 'admin') {
      complaints = complaints.filter(c => c.model_id === parseInt(model_id));
    }

    // Get model details for each complaint
    const complaintsWithDetails = await Promise.all(
      complaints.map(async (complaint) => {
        let model = null;
        if (complaint.model_id) {
          model = await Model.findById(complaint.model_id);
        }

        const user = await User.findById(complaint.user_id);

        return {
          ...complaint,
          model: model ? {
            model_id: model.model_id,
            full_name: model.full_name
          } : null,
          user: user ? {
            user_id: user.user_id,
            email: user.email
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: complaintsWithDetails,
      count: complaintsWithDetails.length
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get complaint by ID
 */
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check authorization
    if (userRole === 'model' && complaint.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    // Get model details
    let model = null;
    if (complaint.model_id) {
      model = await Model.findById(complaint.model_id);
    }

    // Get user details
    const user = await User.findById(complaint.user_id);

    res.json({
      success: true,
      data: {
        ...complaint,
        model: model ? {
          model_id: model.model_id,
          full_name: model.full_name
        } : null,
        user: user ? {
          user_id: user.user_id,
          email: user.email
        } : null
      }
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Resolve/update complaint (admin)
 */
exports.resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can resolve complaints'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const updateData = {};
    
    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }
      updateData.status = status;
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date();
    }

    await Complaint.update(id, updateData);

    const updatedComplaint = await Complaint.findById(id);

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Add response to complaint
 */
exports.addResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Response is required'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check authorization
    const userRole = req.user.role;
    const userId = req.user.user_id;

    if (userRole !== 'admin' && complaint.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this complaint'
      });
    }

    // Add response to existing responses or create new array
    let responses = [];
    if (complaint.response) {
      try {
        responses = typeof complaint.response === 'string' 
          ? JSON.parse(complaint.response) 
          : complaint.response;
      } catch (e) {
        responses = [];
      }
    }

    responses.push({
      user_id: userId,
      role: userRole,
      message: response,
      timestamp: new Date().toISOString()
    });

    await Complaint.update(id, { 
      response: JSON.stringify(responses),
      status: userRole === 'admin' && complaint.status === 'open' ? 'in_progress' : complaint.status
    });

    const updatedComplaint = await Complaint.findById(id);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete complaint
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete complaints'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await Complaint.delete(id);

    res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
