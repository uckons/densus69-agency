const { Model, Transaction, User } = require('../models');
const db = require('../config/database');
const {
  calculateTotalRevenue,
  calculateAdminFees,
  calculateNetPayout,
  groupRevenueByModel
} = require('../utils/calculation');


async function ensureModelAgentColumns() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS model_grades (
      id SERIAL PRIMARY KEY,
      grade_name VARCHAR(50) UNIQUE NOT NULL,
      rate_per_trx DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL');
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_fee_percent DECIMAL(5,2) DEFAULT 0');
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES model_grades(id) ON DELETE SET NULL');

  const gradeCountResult = await db.query('SELECT COUNT(*)::int AS total FROM model_grades');
  if (gradeCountResult.rows[0].total === 0) {
    await db.query(`
      INSERT INTO model_grades (grade_name, rate_per_trx)
      VALUES ('Bronze', 100000), ('Silver', 150000), ('Gold', 250000)
    `);
  }
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
        g.id AS grade_id,
        g.grade_name,
        COALESCE(g.rate_per_trx, m.rate, 0) AS grade_rate_per_trx,
        COALESCE(m.agent_fee_percent, 0) AS agent_fee_percent,
        GREATEST(COALESCE(g.rate_per_trx, m.rate, 0) - (COALESCE(g.rate_per_trx, m.rate, 0) * COALESCE(m.agent_fee_percent, 0) / 100), 0) AS estimated_model_fee,
        (COALESCE(g.rate_per_trx, m.rate, 0) * COALESCE(m.agent_fee_percent, 0) / 100) AS estimated_agent_fee
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN agents a ON m.agent_id = a.id
      LEFT JOIN model_grades g ON m.grade_id = g.id
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
      grade_id,
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

    const parsedGradeId = grade_id ? Number(grade_id) : null;
    const parsedAgentId = agent_id ? Number(agent_id) : null;
    const parsedAgentFeePercent = Number(agent_fee_percent || 0);

    if (!parsedGradeId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Grade model wajib dipilih' });
    }

    const gradeResult = await client.query('SELECT id, rate_per_trx FROM model_grades WHERE id = $1', [parsedGradeId]);
    if (gradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Grade model tidak valid' });
    }

    const parsedRate = Number(gradeResult.rows[0].rate_per_trx || 0);

    const modelResult = await client.query(
      `INSERT INTO models (
        user_id, full_name, phone, gender, address,
        status, is_active, rate, grade_id, agent_id, agent_fee_percent, created_at
      ) VALUES ($1,$2,$3,$4,$5,'vacant',true,$6,$7,$8,$9,NOW()) RETURNING *`,
      [userId, full_name, phone || null, gender || null, address || city || null, parsedRate, parsedGradeId, parsedAgentId, parsedAgentFeePercent]
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
 * Update manual model and agent binding
 */
exports.updateManualModel = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await ensureModelAgentColumns();

    const { id } = req.params;
    const {
      full_name,
      email,
      password,
      phone,
      gender,
      city,
      address,
      grade_id,
      agent_id,
      agent_fee_percent,
      status
    } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ success: false, message: 'full_name dan email wajib diisi' });
    }

    await client.query('BEGIN');

    const modelCheck = await client.query('SELECT id, user_id FROM models WHERE id = $1', [id]);
    if (modelCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Model tidak ditemukan' });
    }

    const userId = modelCheck.rows[0].user_id;

    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Email sudah digunakan user lain' });
    }

    if (password && String(password).trim() !== '') {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query('UPDATE users SET email = $1, password = $2 WHERE id = $3', [email, hashedPassword, userId]);
    } else {
      await client.query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    }

    const parsedGradeId = grade_id ? Number(grade_id) : null;
    const parsedAgentId = agent_id ? Number(agent_id) : null;
    const parsedAgentFeePercent = Number(agent_fee_percent || 0);

    if (!parsedGradeId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Grade model wajib dipilih' });
    }

    const gradeResult = await client.query('SELECT id, rate_per_trx FROM model_grades WHERE id = $1', [parsedGradeId]);
    if (gradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Grade model tidak valid' });
    }

    const parsedRate = Number(gradeResult.rows[0].rate_per_trx || 0);

    const updateResult = await client.query(
      `UPDATE models
       SET full_name = $1,
           phone = $2,
           gender = $3,
           address = $4,
           rate = $5,
           grade_id = $6,
           agent_id = $7,
           agent_fee_percent = $8,
           status = COALESCE($9, status)
       WHERE id = $10
       RETURNING *`,
      [
        full_name,
        phone || null,
        gender || null,
        address || city || null,
        parsedRate,
        parsedGradeId,
        parsedAgentId,
        parsedAgentFeePercent,
        status || null,
        id
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Model berhasil diupdate',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update manual model error:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

/**
 * Delete model
 */
exports.deleteModel = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const modelResult = await client.query('SELECT id, user_id FROM models WHERE id = $1', [id]);
    if (modelResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Model not found' });
    }

    const userId = modelResult.rows[0].user_id;

    await client.query('DELETE FROM models WHERE id = $1', [id]);

    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    await client.query('COMMIT');

    return res.json({ success: true, message: 'Model deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete model error:', error);
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
 * Get model grades
 */
exports.getModelGrades = async (req, res) => {
  try {
    await ensureModelAgentColumns();
    const result = await db.query('SELECT * FROM model_grades ORDER BY rate_per_trx ASC');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get model grades error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create model grade
 */
exports.createModelGrade = async (req, res) => {
  try {
    await ensureModelAgentColumns();
    const { grade_name, rate_per_trx } = req.body;
    if (!grade_name || rate_per_trx === undefined) {
      return res.status(400).json({ success: false, message: 'grade_name dan rate_per_trx wajib diisi' });
    }
    const result = await db.query(
      'INSERT INTO model_grades (grade_name, rate_per_trx) VALUES ($1, $2) RETURNING *',
      [grade_name, Number(rate_per_trx || 0)]
    );
    return res.json({ success: true, message: 'Grade berhasil ditambahkan', data: result.rows[0] });
  } catch (error) {
    console.error('Create model grade error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update model grade
 */
exports.updateModelGrade = async (req, res) => {
  try {
    await ensureModelAgentColumns();
    const { id } = req.params;
    const { grade_name, rate_per_trx } = req.body;
    if (!grade_name || rate_per_trx === undefined) {
      return res.status(400).json({ success: false, message: 'grade_name dan rate_per_trx wajib diisi' });
    }
    const result = await db.query(
      'UPDATE model_grades SET grade_name = $1, rate_per_trx = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [grade_name, Number(rate_per_trx || 0), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Grade tidak ditemukan' });

    // sync model rate berdasarkan grade
    await db.query('UPDATE models SET rate = $1 WHERE grade_id = $2', [Number(rate_per_trx || 0), id]);

    return res.json({ success: true, message: 'Grade berhasil diupdate', data: result.rows[0] });
  } catch (error) {
    console.error('Update model grade error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete model grade
 */
exports.deleteModelGrade = async (req, res) => {
  try {
    await ensureModelAgentColumns();
    const { id } = req.params;

    const used = await db.query('SELECT COUNT(*)::int AS total FROM models WHERE grade_id = $1', [id]);
    if (used.rows[0].total > 0) {
      return res.status(400).json({ success: false, message: 'Grade masih dipakai model, tidak bisa dihapus' });
    }

    const result = await db.query('DELETE FROM model_grades WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Grade tidak ditemukan' });

    return res.json({ success: true, message: 'Grade berhasil dihapus' });
  } catch (error) {
    console.error('Delete model grade error:', error);
    return res.status(500).json({ success: false, message: error.message });
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
