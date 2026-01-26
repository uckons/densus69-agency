const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Model } = require('../models');

/**
 * Register a new user and model profile
 */
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      address,
      date_of_birth,
      height,
      weight,
      bust_size,
      waist_size,
      hip_size
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'model'
    });

    // Create model profile
    await Model.create({
      user_id: user.user_id,
      full_name,
      phone,
      address,
      date_of_birth,
      height,
      weight,
      bust_size,
      waist_size,
      hip_size,
      status: 'pending',
      rate: 0
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get model profile if user is a model
    let modelProfile = null;
    if (user.role === 'model') {
      modelProfile = await Model.findByUserId(user.user_id);
      
      if (modelProfile && modelProfile.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your account is not active. Please contact admin.',
          status: modelProfile.status
        });
      }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        model_id: modelProfile ? modelProfile.model_id : null
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role
        },
        model: modelProfile,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let modelProfile = null;
    if (user.role === 'model') {
      modelProfile = await Model.findByUserId(user.user_id);
    }

    res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        model: modelProfile
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
