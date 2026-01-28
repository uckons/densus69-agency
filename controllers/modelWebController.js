const db = require('../config/database');

// Helper function to format currency
const formatCurrency = (amount) => {
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

exports.showDashboard = async (req, res) => {
  try {
    console.log('Dashboard - User:', req.user);
    
    // Get model profile
    const modelResult = await db.query(
      'SELECT * FROM models WHERE user_id = $1',
      [req.user.userId]
    );
    
    const model = modelResult.rows[0];
    
    if (!model) {
      return res.status(404).send('Model profile not found');
    }

    // Get simple stats without transactions for now
    const statsResult = await db.query(`
      SELECT 
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings
      FROM bookings b
      WHERE b.model_id = $1
    `, [model.id]);

    const stats = statsResult.rows[0] || {
      completed_jobs: 0,
      pending_bookings: 0
    };

    // Get recent bookings
    const bookingsResult = await db.query(`
      SELECT b.*, j.title as job_title, j.client_name
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
      ORDER BY b.created_at DESC
      LIMIT 5
    `, [model.id]);

    res.render('model/dashboard', {
      user: {
        userId: req.user.userId,
        email: req.user.email,
        name: model.full_name
      },
      model: model,
      stats: {
        totalEarnings: 0,
        monthlyEarnings: 0,
        completedJobs: parseInt(stats.completed_jobs) || 0,
        pendingBookings: parseInt(stats.pending_bookings) || 0
      },
      recentBookings: bookingsResult.rows,
      formatCurrency: formatCurrency
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard: ' + error.message);
  }
};

exports.showProfile = async (req, res) => {
  try {
    const modelResult = await db.query(
      'SELECT * FROM models WHERE user_id = $1',
      [req.user.userId]
    );
    
    res.render('model/profile', {
      user: req.user,
      model: modelResult.rows[0]
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).send('Error loading profile');
  }
};

exports.showEditProfile = async (req, res) => {
  try {
    const modelResult = await db.query(
      'SELECT * FROM models WHERE user_id = $1',
      [req.user.userId]
    );
    
    res.render('model/edit-profile', {
      user: req.user,
      model: modelResult.rows[0]
    });
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).send('Error loading edit profile');
  }
};

exports.showGallery = async (req, res) => {
  try {
    const modelResult = await db.query(
      'SELECT * FROM models WHERE user_id = $1',
      [req.user.userId]
    );
    
    const model = modelResult.rows[0];
    
    const photosResult = await db.query(
      'SELECT * FROM photos WHERE model_id = $1 ORDER BY created_at DESC',
      [model.id]
    );
    
    res.render('model/gallery', {
      user: req.user,
      model: model,
      photos: photosResult.rows
    });
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).send('Error loading gallery');
  }
};

exports.showJobs = async (req, res) => {
  try {
    const jobsResult = await db.query(`
      SELECT * FROM jobs 
      WHERE status = 'open' 
      ORDER BY created_at DESC
    `);
    
    res.render('model/jobs', {
      user: req.user,
      jobs: jobsResult.rows
    });
  } catch (error) {
    console.error('Jobs error:', error);
    res.status(500).send('Error loading jobs');
  }
};

exports.showBookings = async (req, res) => {
  try {
    const modelResult = await db.query(
      'SELECT * FROM models WHERE user_id = $1',
      [req.user.userId]
    );
    
    const model = modelResult.rows[0];
    
    const bookingsResult = await db.query(`
      SELECT b.*, j.title as job_title, j.client_name, j.rate
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
      ORDER BY b.created_at DESC
    `, [model.id]);
    
    res.render('model/bookings', {
      user: req.user,
      bookings: bookingsResult.rows
    });
  } catch (error) {
    console.error('Bookings error:', error);
    res.status(500).send('Error loading bookings');
  }
};

module.exports = exports;
