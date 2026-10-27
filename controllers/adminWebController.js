const db = require('../config/database');
const Receipts = require('../utils/receipts');

// Helper function to format currency
const formatCurrency = (amount) => {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
};


async function ensureAnalyticsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS model_grades (
      id SERIAL PRIMARY KEY,
      grade_name VARCHAR(50) UNIQUE NOT NULL,
      rate_per_trx DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES model_grades(id) ON DELETE SET NULL');
}

exports.showDashboard = async (req, res) => {
  try {
    await require('../database/payroll-schema')();
    await ensureAnalyticsSchema();
    const cashData = await Receipts.all();
    const cashSummary = Receipts.summarize(cashData.transactions, cashData.payments);
    
    // Get total models
    const modelsResult = await db.query('SELECT COUNT(*) as total FROM models');
    const totalModels = parseInt(modelsResult.rows[0].total) || 0;

    // Get total jobs
    const jobsResult = await db.query('SELECT COUNT(*) as total FROM jobs');
    const totalJobs = parseInt(jobsResult.rows[0].total) || 0;

    // Get total transactions
    const transactionsResult = await db.query('SELECT COUNT(*) as total, (SELECT COALESCE(SUM(amount),0) FROM client_payments WHERE voided_at IS NULL) as total_revenue FROM transactions');
    const totalTransactions = parseInt(transactionsResult.rows[0].total) || 0;
    const totalRevenue = parseFloat(transactionsResult.rows[0].total_revenue) || 0;

    // Get monthly revenue
    const monthlyRevenueResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_revenue
      FROM client_payments
      WHERE voided_at IS NULL AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
      AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))
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
    const monthlyChartResult = await db.query(`SELECT TO_CHAR(payment_date, 'YYYY-MM') AS year_month,
        TO_CHAR(payment_date, 'Mon') AS month, SUM(amount) AS revenue FROM client_payments
        WHERE voided_at IS NULL AND payment_date >= (DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '11 months')
        GROUP BY 1,2 ORDER BY 1`);

    res.render('admin/dashboard', {
      user: req.user,
      stats: {
        totalModels,
        totalJobs,
        totalTransactions,
        totalRevenue,
        totalInvoiced: cashSummary.totalInvoiced, outstanding: cashSummary.outstanding,
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
    await ensureAnalyticsSchema();

    const transactionsResult = await db.query(`
      SELECT
        t.*,
        m.full_name as model_name,
        g.grade_name as model_grade_name,
        a.full_name as agent_name,
        COALESCE(t.agent_fee_amount, GREATEST(COALESCE(t.gross_amount, 0) - COALESCE(t.admin_fee, 0) - COALESCE(t.net_amount, 0), 0)) as agent_fee_total
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      LEFT JOIN model_grades g ON m.grade_id = g.id
      LEFT JOIN agents a ON m.agent_id = a.id
      ORDER BY t.transaction_date DESC
    `);
    
    res.render('admin/transactions', {
      user: req.user,
      transactions: await Receipts.attach(transactionsResult.rows),
      formatCurrency: formatCurrency
    });
  } catch (error) {
    console.error('Transactions list error:', error);
    res.status(500).send('Error loading transactions');
  }
};

exports.showAnalytics = async (req, res) => {
  try {
    await ensureAnalyticsSchema();

    const { start_date, end_date } = req.query;

    const transactionsResult = await db.query(`
      SELECT
        t.*,
        m.full_name AS model_name,
        g.grade_name AS model_grade_name,
        COALESCE(t.agent_fee_amount, GREATEST(COALESCE(t.gross_amount, 0) - COALESCE(t.admin_fee, 0) - COALESCE(t.net_amount, 0), 0)) AS agent_fee_total
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      LEFT JOIN model_grades g ON m.grade_id = g.id
      ORDER BY t.transaction_date ASC
    `);

    let transactions = transactionsResult.rows;
    if (start_date) {
      const startDate = new Date(`${start_date}T00:00:00`);
      transactions = transactions.filter((tx) => new Date(tx.transaction_date) >= startDate);
    }
    if (end_date) {
      const endDate = new Date(`${end_date}T23:59:59`);
      transactions = transactions.filter((tx) => new Date(tx.transaction_date) <= endDate);
    }
    const cashData = await Receipts.all();
    const cashSummary = Receipts.summarize(cashData.transactions, cashData.payments, start_date, end_date);
    const totalRevenue = cashSummary.totalRevenue;
    const totalTransactions = transactions.length;
    const avgTransaction = cashSummary.receiptCount ? totalRevenue / cashSummary.receiptCount : 0;
    const totalCommission = transactions.reduce((sum, tx) => sum + Number(tx.agent_fee_total || 0), 0);

    const byModel = new Map();
    const byMonth = new Map();
    const byGrade = new Map();
    const thisYearByMonth = Array(12).fill(0);
    const lastYearByMonth = Array(12).fill(0);
    const currentYear = Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Jakarta', year:'numeric'}).format(new Date()));

    transactions.forEach((tx) => {
      const modelId = tx.model_id || tx.model_name || 'unknown';
      const modelRow = byModel.get(modelId) || {
        name: tx.model_name || 'Unknown',
        photo: '/images/default-avatar.png',
        jobsCompleted: 0,
        totalEarnings: 0,
        commission: 0
      };
      modelRow.jobsCompleted += Number(tx.transaction_count || 0);
      modelRow.totalEarnings += Number(tx.net_amount || 0);
      modelRow.commission += Number(tx.agent_fee_total || 0);
      byModel.set(modelId, modelRow);

    });
    cashSummary.receipts.forEach(payment => {
      const [year, month] = payment.receipt_date.split('-').map(Number);
      if (year === currentYear) thisYearByMonth[month - 1] += Number(payment.amount);
      if (year === currentYear - 1) lastYearByMonth[month - 1] += Number(payment.amount);
    });
    cashSummary.receipts.forEach(payment => {
      const monthKey = payment.receipt_date.slice(0, 7);
      byMonth.set(monthKey, Number(byMonth.get(monthKey) || 0) + Number(payment.amount));
      const grade = payment.grade_name || 'No Grade';
      byGrade.set(grade, Number(byGrade.get(grade) || 0) + Number(payment.amount));
    });

    const modelStats = Array.from(byModel.values())
      .map((row) => ({
        ...row,
        avgPerJob: row.jobsCompleted ? row.totalEarnings / row.jobsCompleted : 0
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings);

    const topModel = modelStats[0] || null;
    const revenueEntries = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
    const gradeEntries = Array.from(byGrade.entries()).sort((a, b) => b[1] - a[1]);
    const topModels = modelStats.slice(0, 10);

    const analytics = {
      totalRevenue, totalInvoiced: cashSummary.totalInvoiced, outstanding: cashSummary.outstanding, receiptCount: cashSummary.receiptCount,
      revenueGrowth: 0,
      avgTransaction,
      totalTransactions,
      totalCommission,
      topModelEarnings: topModel?.totalEarnings || 0,
      topModelName: topModel?.name || 'N/A'
    };

    const chartData = {
      revenueLabels: revenueEntries.map(([label]) => label),
      revenueData: revenueEntries.map(([, value]) => value),
      jobTypeLabels: gradeEntries.map(([label]) => label),
      jobTypeData: gradeEntries.map(([, value]) => value),
      topModelsLabels: topModels.map((row) => row.name),
      topModelsData: topModels.map((row) => row.totalEarnings),
      monthlyLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      thisYearData: thisYearByMonth,
      lastYearData: lastYearByMonth
    };

    res.render('admin/revenue-analytics', {
      user: req.user,
      analytics,
      chartData,
      modelStats,
      formatCurrency,
      selectedStartDate: start_date || '',
      selectedEndDate: end_date || ''
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
