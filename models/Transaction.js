const db = require('../config/database');
const Payroll = require('../public/js/payroll');

const Transaction = {
  // Create a new transaction
  create: async (data) => {
    const totals = Payroll.calculate(data);
    const values = {
      model_id: data.model_id, client_name: data.client_name,
      transaction_date: data.transaction_date, transaction_count: data.transaction_count,
      model_rate: data.model_rate, admin_fee: totals.admin,
      gross_amount: totals.gross, net_amount: totals.net,
      notes: data.notes ?? null, created_by: data.created_by ?? null,
      safety_fee: data.safety_fee, client_admin_fee: data.client_admin_fee,
      other_deduction: data.other_deduction, fine: totals.fine,
      cash_advance: totals.cash, agent_fee_per_trx: data.agent_fee_per_trx,
      agent_fee_amount: totals.agent, deduction_version: 2
    };
    const columns = Object.keys(values);
    const result = await db.query(`INSERT INTO transactions (${columns.join(', ')}) VALUES (${columns.map((_, index) => '$' + (index + 1)).join(', ')}) RETURNING *`, Object.values(values));
    return result.rows[0];
  },

  // Find transaction by ID
  findById: async (id) => {
    const query = `
      SELECT
        t.*,
        m.full_name as model_name,
        m.rate as current_model_rate,
        COALESCE(m.agent_fee_flat, 0) as current_agent_fee_flat,
        g.grade_name as model_grade_name,
        g.rate_per_trx as model_grade_rate,
        COALESCE(t.agent_fee_amount, GREATEST(COALESCE(t.gross_amount, 0) - COALESCE(t.admin_fee, 0) - COALESCE(t.net_amount, 0), 0)) as agent_fee_total,
        u.email as created_by_email
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      LEFT JOIN model_grades g ON m.grade_id = g.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all transactions with filters
  findAll: async (filters = {}) => {
    let query = `
      SELECT
        t.*,
        m.full_name as model_name,
        g.grade_name as model_grade_name,
        COALESCE(t.agent_fee_amount, GREATEST(COALESCE(t.gross_amount, 0) - COALESCE(t.admin_fee, 0) - COALESCE(t.net_amount, 0), 0)) as agent_fee_total
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      LEFT JOIN model_grades g ON m.grade_id = g.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.model_id) {
      query += ` AND t.model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    if (filters.client_name) {
      query += ` AND t.client_name ILIKE $${paramCount}`;
      params.push(`%${filters.client_name}%`);
      paramCount++;
    }

    if (filters.min_amount !== undefined) {
      query += ` AND t.gross_amount >= $${paramCount}`;
      params.push(filters.min_amount);
      paramCount++;
    }

    if (filters.max_amount !== undefined) {
      query += ` AND t.gross_amount <= $${paramCount}`;
      params.push(filters.max_amount);
      paramCount++;
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  // Find transactions by model
  findByModelId: async (modelId, startDate = null, endDate = null) => {
    let query = `
      SELECT t.*, m.full_name as model_name
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      WHERE t.model_id = $1
    `;
    const params = [modelId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ' ORDER BY t.transaction_date DESC';

    const result = await db.query(query, params);
    return result.rows;
  },

  // Find transactions by date range
  findByDateRange: async (startDate, endDate) => {
    const query = `
      SELECT t.*, m.full_name as model_name
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      WHERE t.transaction_date >= $1 AND t.transaction_date <= $2
      ORDER BY t.transaction_date DESC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
  },

  // Update transaction
  update: async (id, data) => {
    if (data.preserveAmounts) {
      const result = await db.query('UPDATE transactions SET client_name=$1, transaction_date=$2, notes=$3 WHERE id=$4 RETURNING *', [data.client_name, data.transaction_date, data.notes, id]);
      return result.rows[0];
    }
    const totals = Payroll.calculate(data);
    const values = {
      client_name: data.client_name, transaction_date: data.transaction_date,
      transaction_count: data.transaction_count, model_rate: data.model_rate,
      admin_fee: totals.admin, gross_amount: totals.gross, net_amount: totals.net,
      notes: data.notes, safety_fee: data.safety_fee,
      client_admin_fee: data.client_admin_fee, other_deduction: data.other_deduction,
      fine: totals.fine, cash_advance: totals.cash,
      agent_fee_per_trx: data.agent_fee_per_trx, agent_fee_amount: totals.agent,
      deduction_version: 2
    };
    const columns = Object.keys(values);
    const result = await db.query(`UPDATE transactions SET ${columns.map((name, i) => name + ' = $' + (i + 1)).join(', ')} WHERE id = $${columns.length + 1} RETURNING *`, [...Object.values(values), id]);
    return result.rows[0];
  },

  // Delete transaction
  delete: async (id) => {
    const query = 'DELETE FROM transactions WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Get revenue by date range
  getRevenueByDateRange: async (startDate, endDate) => {
    const query = `
      SELECT 
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        SUM(admin_fee) as total_fees,
        COUNT(*) as transaction_count,
        SUM(transaction_count) as total_bookings
      FROM transactions
      WHERE transaction_date >= $1 AND transaction_date <= $2
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows[0];
  },

  // Get revenue by model and date range
  getRevenueByModel: async (modelId, startDate = null, endDate = null) => {
    let query = `
      SELECT 
        m.id as model_id,
        m.full_name as model_name,
        SUM(t.gross_amount) as total_gross,
        SUM(t.net_amount) as total_net,
        SUM(t.admin_fee) as total_fees,
        COUNT(*) as transaction_count,
        SUM(t.transaction_count) as total_bookings
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      WHERE t.model_id = $1
    `;
    const params = [modelId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ' GROUP BY m.id, m.full_name';

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Get revenue by period (day, week, month, year)
  getRevenueByPeriod: async (period = 'month', startDate = null, endDate = null) => {
    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }

    let query = `
      SELECT 
        TO_CHAR(transaction_date, '${dateFormat}') as period,
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        SUM(admin_fee) as total_fees,
        COUNT(*) as transaction_count,
        SUM(transaction_count) as total_bookings
      FROM transactions
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ' GROUP BY period ORDER BY period DESC';

    const result = await db.query(query, params);
    return result.rows;
  },

  // Get top models by revenue
  getTopModelsByRevenue: async (limit = 10, startDate = null, endDate = null) => {
    let query = `
      SELECT 
        m.id as model_id,
        m.full_name as model_name,
        SUM(t.gross_amount) as total_gross,
        SUM(t.net_amount) as total_net,
        SUM(t.admin_fee) as total_fees,
        COUNT(*) as transaction_count,
        SUM(t.transaction_count) as total_bookings,
        AVG(t.model_rate) as avg_rate
      FROM transactions t
      INNER JOIN models m ON t.model_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND t.transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND t.transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` 
      GROUP BY m.id, m.full_name
      ORDER BY total_gross DESC
      LIMIT $${paramCount}
    `;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  },

  // Get transaction statistics
  getStats: async (startDate = null, endDate = null) => {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(gross_amount) as total_gross,
        SUM(net_amount) as total_net,
        SUM(admin_fee) as total_fees,
        AVG(gross_amount) as avg_gross,
        AVG(model_rate) as avg_rate,
        SUM(transaction_count) as total_bookings,
        COUNT(DISTINCT model_id) as active_models,
        COUNT(DISTINCT client_name) as unique_clients
      FROM transactions
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND transaction_date <= $${paramCount}`;
      params.push(endDate);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Count transactions
  count: async (filters = {}) => {
    let query = 'SELECT COUNT(*) as count FROM transactions WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.model_id) {
      query += ` AND model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND transaction_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND transaction_date <= $${paramCount}`;
      params.push(filters.end_date);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }
};

module.exports = Transaction;
