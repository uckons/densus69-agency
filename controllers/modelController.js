const { Model, Photo, Transaction } = require('../models');
const { calculateNetPayout } = require('../utils/calculation');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get model profile
 */
exports.getProfile = async (req, res) => {
  try {
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as model'
      });
    }

    const model = await Model.findById(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model profile not found'
      });
    }

    // Get photos
    const photos = await Photo.findByModelId(modelId);

    res.json({
      success: true,
      data: {
        model,
        photos
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update model profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as model'
      });
    }

    const {
      full_name,
      phone,
      address,
      date_of_birth,
      height,
      weight,
      bust_size,
      waist_size,
      hip_size,
      bio
    } = req.body;

    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;
    if (height) updateData.height = height;
    if (weight) updateData.weight = weight;
    if (bust_size) updateData.bust_size = bust_size;
    if (waist_size) updateData.waist_size = waist_size;
    if (hip_size) updateData.hip_size = hip_size;
    if (bio !== undefined) updateData.bio = bio;

    await Model.update(modelId, updateData);

    const updatedModel = await Model.findById(modelId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedModel
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get model dashboard with earnings
 */
exports.getDashboard = async (req, res) => {
  try {
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as model'
      });
    }

    const model = await Model.findById(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model profile not found'
      });
    }

    // Get transactions
    const transactions = await Transaction.findByModelId(modelId);

    // Calculate earnings
    const totalEarnings = calculateNetPayout(transactions);
    const totalTransactions = transactions.length;

    // Calculate monthly earnings
    const monthlyEarnings = {};
    transactions.forEach(t => {
      const month = new Date(t.transaction_date).toISOString().substring(0, 7);
      if (!monthlyEarnings[month]) {
        monthlyEarnings[month] = 0;
      }
      monthlyEarnings[month] += parseFloat(t.net_amount || 0);
    });

    // Get photos count
    const photos = await Photo.findByModelId(modelId);

    res.json({
      success: true,
      data: {
        model,
        statistics: {
          totalEarnings,
          totalTransactions,
          currentRate: model.rate,
          photosCount: photos.length,
          status: model.status
        },
        monthlyEarnings,
        recentTransactions: transactions.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Upload photos
 */
exports.uploadPhotos = async (req, res) => {
  try {
    const modelId = req.user.model_id;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as model'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      const photo = await Photo.create({
        model_id: modelId,
        photo_url: `/uploads/${file.filename}`,
        caption: req.body.caption || null
      });
      uploadedPhotos.push(photo);
    }

    res.status(201).json({
      success: true,
      message: 'Photos uploaded successfully',
      data: uploadedPhotos
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete photo
 */
exports.deletePhoto = async (req, res) => {
  try {
    const modelId = req.user.model_id;
    const { id } = req.params;

    if (!modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as model'
      });
    }

    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check ownership
    if (photo.model_id !== modelId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this photo'
      });
    }

    // Delete file from filesystem
    try {
      const filePath = path.join(__dirname, '..', 'public', photo.photo_url);
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
      // Continue even if file deletion fails
    }

    // Delete from database
    await Photo.delete(id);

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get public gallery for a model
 */
exports.getPublicGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await Model.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    // Only show gallery for active models
    if (model.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Model gallery not available'
      });
    }

    const photos = await Photo.findByModelId(id);

    res.json({
      success: true,
      data: {
        model: {
          model_id: model.id,
          full_name: model.full_name,
          height: model.height,
          weight: model.weight,
          bust_size: model.bust_size,
          waist_size: model.waist_size,
          hip_size: model.hip_size,
          bio: model.bio
        },
        photos
      }
    });
  } catch (error) {
    console.error('Get public gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
