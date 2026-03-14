const { Model, Transaction, User } = require('../models');
const db = require('../config/database');
const {
  calculateTotalRevenue,
  calculateAdminFees,
  calculateNetPayout,
  groupRevenueByModel
} = require('../utils/calculation');


async function ensureModelAgentColumns() {
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL');
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_fee_percent DECIMAL(5,2) DEFAULT 0');
}

/**
 * Get admin dashboard with statistics
 */
exports.getDashboard = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get all models
    const models = await Model.findAll();
    const activeModels = models.filter(m => m.status === 'active');
    const pendingModels = models.filter(m => m.status === 'pending');

    // Get transactions
    let transactions = await Transaction.findAll();
    
    // Filter by date range if provided
    if (start_date && end_date) {
      transactions = transactions.filter(t => {
        const transDate = new Date(t.transaction_date);
        return transDate >= new Date(start_date) && transDate <= new Date(end_date);
      });
    }

    // Calculate revenue statistics
    const totalRevenue = calculateTotalRevenue(transactions);
    const adminFees = calculateAdminFees(transactions);
    const netPayouts = calculateNetPayout(transactions);
    const revenueByModel = groupRevenueByModel(transactions);

    // Calculate monthly revenue for chart
    const monthlyRevenue = {};
    transactions.forEach(t => {
      const month = new Date(t.transaction_date).toISOString().substring(0, 7);
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = 0;
      }
      monthlyRevenue[month] += parseFloat(t.gross_amount || 0);
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalModels: models.length,
          activeModels: activeModels.length,
          pendingModels: pendingModels.length,
          totalTransactions: transactions.length,
          totalRevenue,
          adminFees,
          netPayouts
        },
        revenueByModel,
        monthlyRevenue,
        recentTransactions: transactions.slice(0, 10)
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
 * Get all models with filters
 */
exports.getModels = async (req, res) => {
  try {
    await ensureModelAgentColumns();

    const { status, search } = req.query;

    const params = [];
    let paramCount = 1;

    let query = `
      SELECT
        m.*,
        u.email,
        a.id AS agent_id,
        a.full_name AS agent_name,
        a.commission_rate AS agent_commission_rate,
        COALESCE(m.agent_fee_percent, 0) AS agent_fee_percent,
        GREATEST(COALESCE(m.rate, 0) - (COALESCE(m.rate, 0) * COALESCE(m.agent_fee_percent, 0) / 100), 0) AS estimated_model_fee,
        (COALESCE(m.rate, 0) * COALESCE(m.agent_fee_percent, 0) / 100) AS estimated_agent_fee
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN agents a ON m.agent_id = a.id
      WHERE 1 = 1
    `;

    if (status) {
      query += ` AND m.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND (m.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY m.created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create manual model and bind to agent
 */
exports.createManualModel = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await ensureModelAgentColumns();

    const {
      full_name,
      email,
      password,
      phone,
      gender,
      city,
      address,
      rate,
      agent_id,
      agent_fee_percent
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'full_name, email, dan password wajib diisi' });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      'INSERT INTO users (email, password, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email',
      [email, hashedPassword, 'model']
    );

    const userId = userResult.rows[0].id;

    const parsedRate = Number(rate || 0);
    const parsedAgentId = agent_id ? Number(agent_id) : null;
    const parsedAgentFeePercent = Number(agent_fee_percent || 0);

    const modelResult = await client.query(
      `INSERT INTO models (
        user_id, full_name, phone, gender, address,
        status, is_active, rate, agent_id, agent_fee_percent, created_at
      ) VALUES ($1,$2,$3,$4,$5,'vacant',true,$6,$7,$8,NOW()) RETURNING *`,
      [userId, full_name, phone || null, gender || null, address || city || null, parsedRate, parsedAgentId, parsedAgentFeePercent]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Model manual berhasil ditambahkan',
      data: modelResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create manual model error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Get model detail
 */
exports.getModelDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const model = await Model.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    // Get model's transactions
    const transactions = await Transaction.findByModelId(id);
    
    // Calculate earnings
    const totalEarnings = calculateNetPayout(transactions);
    const totalTransactions = transactions.length;

    res.json({
      success: true,
      data: {
        model,
        statistics: {
          totalEarnings,
          totalTransactions
        },
        recentTransactions: transactions.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get model detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update model status
 */
exports.updateModelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const model = await Model.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    await Model.update(id, { status });

    res.json({
      success: true,
      message: 'Model status updated successfully',
      data: { status }
    });
  } catch (error) {
    console.error('Update model status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update model rate
 */
exports.updateModelRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    if (!rate || rate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate value'
      });
    }

    const model = await Model.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    await Model.update(id, { rate: parseFloat(rate) });

    res.json({
      success: true,
      message: 'Model rate updated successfully',
      data: { rate }
    });
  } catch (error) {
    console.error('Update model rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get revenue analytics
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month', year, month } = req.query;

    let transactions = await Transaction.findAll();

    // Filter by year
    if (year) {
      transactions = transactions.filter(t => 
        new Date(t.transaction_date).getFullYear() === parseInt(year)
      );
    }

    // Filter by month
    if (month) {
      transactions = transactions.filter(t => 
        new Date(t.transaction_date).getMonth() === parseInt(month) - 1
      );
    }

    // Group data based on period
    const analytics = {};
    
    if (period === 'day') {
      // Group by day
      transactions.forEach(t => {
        const day = new Date(t.transaction_date).toISOString().split('T')[0];
        if (!analytics[day]) {
          analytics[day] = { revenue: 0, transactions: 0, adminFees: 0 };
        }
        analytics[day].revenue += parseFloat(t.gross_amount || 0);
        analytics[day].adminFees += parseFloat(t.admin_fee || 0);
        analytics[day].transactions += 1;
      });
    } else if (period === 'month') {
      // Group by month
      transactions.forEach(t => {
        const month = new Date(t.transaction_date).toISOString().substring(0, 7);
        if (!analytics[month]) {
          analytics[month] = { revenue: 0, transactions: 0, adminFees: 0 };
        }
        analytics[month].revenue += parseFloat(t.gross_amount || 0);
        analytics[month].adminFees += parseFloat(t.admin_fee || 0);
        analytics[month].transactions += 1;
      });
    } else if (period === 'year') {
      // Group by year
      transactions.forEach(t => {
        const year = new Date(t.transaction_date).getFullYear().toString();
        if (!analytics[year]) {
          analytics[year] = { revenue: 0, transactions: 0, adminFees: 0 };
        }
        analytics[year].revenue += parseFloat(t.gross_amount || 0);
        analytics[year].adminFees += parseFloat(t.admin_fee || 0);
        analytics[year].transactions += 1;
      });
    }

    // Calculate totals
    const totalRevenue = calculateTotalRevenue(transactions);
    const totalAdminFees = calculateAdminFees(transactions);
    const totalNetPayouts = calculateNetPayout(transactions);

    res.json({
      success: true,
      data: {
        period,
        analytics,
        summary: {
          totalRevenue,
          totalAdminFees,
          totalNetPayouts,
          totalTransactions: transactions.length
        }
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
