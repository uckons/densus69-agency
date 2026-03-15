const { Transaction, Model } = require('../models');
const db = require('../config/database');
const { calculateSalary } = require('../utils/calculation');

/**
 * Get models that are assigned to jobs
 */
exports.getAssignedModels = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT
        m.id,
        m.full_name,
        m.rate,
        m.status,
        m.is_active,
        j.id AS job_id,
        j.title AS job_title,
        j.client_name
      FROM bookings b
      INNER JOIN models m ON m.id = b.model_id
      INNER JOIN jobs j ON j.id = b.job_id
      WHERE b.status IN ('pending', 'confirmed', 'completed')
        AND j.status IN ('open', 'assigned', 'completed')
      ORDER BY m.full_name ASC
    `);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get assigned models error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      model_id,
      client_name,
      transaction_count,
      transaction_date,
      description
    } = req.body;

    // Validate required fields
    if (!model_id || !client_name || !transaction_count || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: 'model_id, client_name, transaction_count, dan transaction_date wajib diisi'
      });
    }

    // Get model to retrieve rate
    const model = await Model.findById(model_id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    if (!model.rate || model.rate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Model rate not set'
      });
    }

    // Ensure model is assigned to at least one relevant job
    const assignmentCheck = await db.query(`
      SELECT b.id
      FROM bookings b
      INNER JOIN jobs j ON j.id = b.job_id
      WHERE b.model_id = $1
        AND b.status IN ('pending', 'confirmed', 'completed')
        AND j.status IN ('open', 'assigned', 'completed')
      LIMIT 1
    `, [model_id]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Model belum ter-assign pada job aktif'
      });
    }

    // Calculate amounts
    const { grossAmount, adminFee, netAmount } = calculateSalary(
      parseInt(transaction_count),
      parseFloat(model.rate),
      0
    );

    // Create transaction
    const transaction = await Transaction.create({
      model_id,
      client_name,
      transaction_count: parseInt(transaction_count),
      transaction_date,
      model_rate: parseFloat(model.rate),
      admin_fee: adminFee,
      notes: description || null,
      created_by: req.user?.id || null
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


/**
 * Get client KPI summary
 */
exports.getClientKpis = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(DISTINCT client_name) AS total_clients,
        COALESCE(SUM(gross_amount), 0) AS total_revenue
      FROM transactions
      WHERE client_name IS NOT NULL AND TRIM(client_name) <> ''
    `);

    const topClientResult = await db.query(`
      SELECT
        client_name,
        COUNT(*)::int AS total_records,
        COALESCE(SUM(transaction_count), 0)::int AS total_trx,
        COALESCE(SUM(gross_amount), 0) AS total_revenue
      FROM transactions
      WHERE client_name IS NOT NULL AND TRIM(client_name) <> ''
      GROUP BY client_name
      ORDER BY total_revenue DESC
      LIMIT 1
    `);

    return res.json({
      success: true,
      data: {
        total_clients: Number(result.rows[0]?.total_clients || 0),
        total_revenue: Number(result.rows[0]?.total_revenue || 0),
        top_client: topClientResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Get client KPI error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get all transactions with filters
 */
exports.getTransactions = async (req, res) => {
  try {
    const { model_id, start_date, end_date, limit } = req.query;

    let transactions = await Transaction.findAll();

    // Filter by model_id
    if (model_id) {
      transactions = transactions.filter(t => t.model_id === parseInt(model_id));
    }

    // Filter by date range
    if (start_date) {
      transactions = transactions.filter(t => 
        new Date(t.transaction_date) >= new Date(start_date)
      );
    }
    if (end_date) {
      transactions = transactions.filter(t => 
        new Date(t.transaction_date) <= new Date(end_date)
      );
    }

    // Limit results
    if (limit) {
      transactions = transactions.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get transaction by ID
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get model details
    const model = await Model.findById(transaction.model_id);

    res.json({
      success: true,
      data: {
        transaction,
        model: model ? {
          model_id: model.id,
          full_name: model.full_name,
          rate: model.rate
        } : null
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update transaction
 */
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_count,
      transaction_date,
      description
    } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get model to retrieve rate
    const model = await Model.findById(transaction.model_id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Associated model not found'
      });
    }

    const updateData = {};

    // If transaction_count is updated, recalculate amounts
    if (transaction_count) {
      const { grossAmount, adminFee, netAmount } = calculateSalary(
        parseInt(transaction_count),
        parseFloat(model.rate)
      );
      
      updateData.transaction_count = parseInt(transaction_count);
      updateData.gross_amount = grossAmount;
      updateData.admin_fee = adminFee;
      updateData.net_amount = netAmount;
    }

    if (transaction_date) {
      updateData.transaction_date = transaction_date;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    await Transaction.update(id, updateData);

    const updatedTransaction = await Transaction.findById(id);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete transaction
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await Transaction.delete(id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
