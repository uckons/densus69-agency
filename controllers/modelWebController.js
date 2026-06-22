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

    // Get booking stats and transaction earnings
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

    const earningsResult = await db.query(`
      SELECT
        COALESCE(SUM(net_amount), 0) as total_earnings,
        COALESCE(SUM(CASE
          WHEN transaction_date >= date_trunc('month', CURRENT_DATE) THEN net_amount
          ELSE 0
        END), 0) as monthly_earnings
      FROM transactions
      WHERE model_id = $1
    `, [model.id]);

    const monthlyRowsResult = await db.query(`
      SELECT EXTRACT(MONTH FROM transaction_date)::int as month, COALESCE(SUM(net_amount), 0) as amount
      FROM transactions
      WHERE model_id = $1 AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY EXTRACT(MONTH FROM transaction_date)
    `, [model.id]);
    const monthlyEarnings = Array(12).fill(0);
    monthlyRowsResult.rows.forEach(row => { monthlyEarnings[row.month - 1] = Number(row.amount || 0); });
    const earnings = earningsResult.rows[0] || { total_earnings: 0, monthly_earnings: 0 };

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
        totalEarnings: Number(earnings.total_earnings || 0),
        monthlyEarnings: Number(earnings.monthly_earnings || 0),
        monthlyEarningsData: monthlyEarnings,
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
    
    const model = modelResult.rows[0];
    const statsResult = await db.query(`
      SELECT
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_jobs,
        COALESCE((SELECT SUM(net_amount) FROM transactions WHERE model_id = $1), 0) as total_earnings
      FROM bookings b WHERE b.model_id = $1
    `, [model.id]);
    const photosResult = await db.query('SELECT * FROM photos WHERE model_id = $1 ORDER BY is_cover DESC, created_at DESC LIMIT 8', [model.id]);
    res.render('model/profile', {
      user: { ...req.user, name: model.full_name },
      model,
      gallery: photosResult.rows.map(photo => ({ ...photo, url: photo.file_path })),
      stats: {
        completedJobs: parseInt(statsResult.rows[0]?.completed_jobs) || 0,
        totalEarnings: Number(statsResult.rows[0]?.total_earnings || 0),
        profileViews: 0
      },
      formatCurrency
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
      photos: photosResult.rows,
      gallery: photosResult.rows.map(photo => ({ ...photo, url: photo.file_path, _id: photo.id, isPrimary: photo.is_cover, createdAt: photo.created_at }))
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
      jobs: jobsResult.rows.map(job => ({ ...job, _id: job.id, type: job.type || 'Modeling', date: job.job_date || job.created_at, rate: job.payment_offered || 0, location: job.location || 'TBD' })),
      formatCurrency
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
      SELECT b.*, j.title as job_title, j.client_name, j.job_date, j.payment_offered
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
      ORDER BY b.created_at DESC
    `, [model.id]);
    
    res.render('model/bookings', {
      user: req.user,
      bookings: bookingsResult.rows.map(booking => ({ ...booking, _id: booking.id, jobType: booking.job_title || 'Modeling Job', date: booking.booking_date || booking.created_at, clientName: booking.client_name || 'Client', amount: booking.payment_amount || booking.payment_offered || 0, location: booking.location || 'TBD', description: booking.notes })),
      formatCurrency
    });
  } catch (error) {
    console.error('Bookings error:', error);
    res.status(500).send('Error loading bookings');
  }
};

module.exports = exports;
