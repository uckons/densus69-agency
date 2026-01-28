const db = require('../config/database');

const Transaction = {
  // Create a new transaction
  create: async (transactionData) => {
    const {
      model_id, client_name, transaction_date, transaction_count,
      model_rate, admin_fee = 50000, notes, created_by
    } = transactionData;

    // Calculate amounts
    const gross_amount = transaction_count * model_rate;
    const net_amount = gross_amount - admin_fee;

    const query = `
      INSERT INTO transactions (
        model_id, client_name, transaction_date, transaction_count,
        model_rate, admin_fee, gross_amount, net_amount, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      model_id, client_name, transaction_date, transaction_count,
      model_rate, admin_fee, gross_amount, net_amount, notes, created_by
    ];

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find transaction by ID
  findById: async (id) => {
    const query = `
      SELECT t.*, m.full_name as model_name, u.email as created_by_email
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all transactions with filters
  findAll: async (filters = {}) => {
    let query = `
      SELECT t.*, m.full_name as model_name
      FROM transactions t
      LEFT JOIN models m ON t.model_id = m.id
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
  update: async (id, transactionData) => {
    const {
      model_id, client_name, transaction_date, transaction_count,
      model_rate, admin_fee, notes
    } = transactionData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (model_id !== undefined) {
      updates.push(`model_id = $${paramCount}`);
      params.push(model_id);
      paramCount++;
    }

    if (client_name !== undefined) {
      updates.push(`client_name = $${paramCount}`);
      params.push(client_name);
      paramCount++;
    }

    if (transaction_date !== undefined) {
      updates.push(`transaction_date = $${paramCount}`);
      params.push(transaction_date);
      paramCount++;
    }

    if (transaction_count !== undefined) {
      updates.push(`transaction_count = $${paramCount}`);
      params.push(transaction_count);
      paramCount++;
    }

    if (model_rate !== undefined) {
      updates.push(`model_rate = $${paramCount}`);
      params.push(model_rate);
      paramCount++;
    }

    if (admin_fee !== undefined) {
      updates.push(`admin_fee = $${paramCount}`);
      params.push(admin_fee);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }

    // Recalculate amounts if relevant fields changed
    if (transaction_count !== undefined || model_rate !== undefined || admin_fee !== undefined) {
      // Get current values
      const current = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (current.rows.length > 0) {
        const currentTx = current.rows[0];
        const newCount = transaction_count !== undefined ? transaction_count : currentTx.transaction_count;
        const newRate = model_rate !== undefined ? model_rate : currentTx.model_rate;
        const newFee = admin_fee !== undefined ? admin_fee : currentTx.admin_fee;

        const gross_amount = newCount * newRate;
        const net_amount = gross_amount - newFee;

        updates.push(`gross_amount = $${paramCount}`);
        params.push(gross_amount);
        paramCount++;

        updates.push(`net_amount = $${paramCount}`);
        params.push(net_amount);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
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
