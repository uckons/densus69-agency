const db = require('../config/database');

// Helper function to format currency
const formatCurrency = (amount) => {
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

exports.showDashboard = async (req, res) => {
  try {
    console.log('Admin Dashboard - User:', req.user);
    
    // Get total models
    const modelsResult = await db.query('SELECT COUNT(*) as total FROM models');
    const totalModels = parseInt(modelsResult.rows[0].total) || 0;

    // Get total jobs
    const jobsResult = await db.query('SELECT COUNT(*) as total FROM jobs');
    const totalJobs = parseInt(jobsResult.rows[0].total) || 0;

    // Get total transactions
    const transactionsResult = await db.query('SELECT COUNT(*) as total, COALESCE(SUM(gross_amount), 0) as total_revenue FROM transactions');
    const totalTransactions = parseInt(transactionsResult.rows[0].total) || 0;
    const totalRevenue = parseFloat(transactionsResult.rows[0].total_revenue) || 0;

    // Get monthly revenue
    const monthlyRevenueResult = await db.query(`
      SELECT COALESCE(SUM(gross_amount), 0) as monthly_revenue 
      FROM transactions 
      WHERE EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM NOW())
    `);
    const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0].monthly_revenue) || 0;

    // Get pending bookings count
    const pendingBookingsResult = await db.query(`
      SELECT COUNT(*) as total FROM bookings WHERE status = 'pending'
    `);
    const pendingBookings = parseInt(pendingBookingsResult.rows[0].total) || 0;

    // Get active jobs count
    const activeJobsResult = await db.query(`
      SELECT COUNT(*) as total FROM jobs WHERE status = 'open'
    `);
    const activeJobs = parseInt(activeJobsResult.rows[0].total) || 0;

    // Get recent transactions
    const recentTransactionsResult = await db.query(`
      SELECT t.*, m.full_name as model_name
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    // Get recent models
    const recentModelsResult = await db.query(`
      SELECT m.*, u.email
      FROM models m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    // Get monthly revenue data for chart (last 12 months)
    const monthlyChartResult = await db.query(`
      SELECT 
        TO_CHAR(transaction_date, 'Mon') as month,
        COALESCE(SUM(gross_amount), 0) as revenue
      FROM transactions
      WHERE transaction_date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(transaction_date, 'Mon'), EXTRACT(MONTH FROM transaction_date)
      ORDER BY EXTRACT(MONTH FROM transaction_date)
    `);

    res.render('admin/dashboard', {
      user: req.user,
      stats: {
        totalModels,
        totalJobs,
        totalTransactions,
        totalRevenue,
        monthlyRevenue,
        pendingBookings,
        activeJobs
      },
      recentTransactions: recentTransactionsResult.rows,
      recentModels: recentModelsResult.rows,
      monthlyChartData: monthlyChartResult.rows,
      formatCurrency: formatCurrency
    });
  } catch (error) {
    console.error('Admin Dashboard error:', error);
    res.status(500).send('Error loading dashboard: ' + error.message);
  }
};

exports.showModels = async (req, res) => {
  try {
    const modelsResult = await db.query(`
      SELECT m.*, u.email, u.created_at as registered_at
      FROM models m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    
    res.render('admin/models-list', {
      user: req.user,
      models: modelsResult.rows
    });
  } catch (error) {
    console.error('Models list error:', error);
    res.status(500).send('Error loading models');
  }
};

exports.showJobs = async (req, res) => {
  try {
    const jobsResult = await db.query(`
      SELECT * FROM jobs 
      ORDER BY created_at DESC
    `);
    
    res.render('admin/jobs-list', {
      user: req.user,
      jobs: jobsResult.rows
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    res.status(500).send('Error loading jobs');
  }
};

exports.showTransactions = async (req, res) => {
  try {
    const transactionsResult = await db.query(`
      SELECT t.*, m.full_name as model_name
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      ORDER BY t.transaction_date DESC
    `);
    
    res.render('admin/transactions', {
      user: req.user,
      transactions: transactionsResult.rows,
      formatCurrency: formatCurrency
    });
  } catch (error) {
    console.error('Transactions list error:', error);
    res.status(500).send('Error loading transactions');
  }
};

exports.showAnalytics = async (req, res) => {
  try {
    res.render('admin/revenue-analytics', {
      user: req.user
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).send('Error loading analytics');
  }
};

exports.showComplaints = async (req, res) => {
  try {
    const complaintsResult = await db.query(`
      SELECT * FROM complaints 
      ORDER BY created_at DESC
    `);
    
    res.render('admin/complaints', {
      user: req.user,
      complaints: complaintsResult.rows
    });
  } catch (error) {
    console.error('Complaints error:', error);
    res.status(500).send('Error loading complaints');
  }
};

module.exports = exports;
