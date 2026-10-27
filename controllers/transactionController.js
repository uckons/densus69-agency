const { Transaction, Model } = require('../models');
const db = require('../config/database');
const ensurePayrollSchema = require('../database/payroll-schema');

function money(value, name) {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result) || result < 0 || result > 9999999999.99) {
    const error = new Error(`${name} harus berupa angka nol atau lebih`);
    error.status = 400; throw error;
  }
  return Math.round(result * 100) / 100;
}
function count(value) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) {
    const error = new Error('Jumlah TRX harus bilangan bulat positif');
    error.status = 400; throw error;
  }
  return result;
}
async function clientSnapshot(name) {
  await ensurePayrollSchema();
  const result = await db.query('SELECT * FROM clients WHERE LOWER(TRIM(client_name)) = LOWER(TRIM($1))', [name]);
  if (result.rows.length !== 1) {
    const error = new Error('Pilih client yang sudah terdaftar di menu Clients');
    error.status = 400; throw error;
  }
  const client = result.rows[0];
  return { client_name: client.client_name, safety_fee: Number(client.safety_fee), client_admin_fee: Number(client.admin_fee), other_deduction: Number(client.other_deduction) };
}

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
        COALESCE(m.agent_fee_flat, 0) AS agent_fee_flat,
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
    return res.status(error.status || (error.code === '23503' ? 409 : 500)).json({ success: false, message: 'Server error', error: error.message });
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
      description,
      admin_fee
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

    const snapshot = await clientSnapshot(client_name);
    const transaction = await Transaction.create({
      ...snapshot, model_id,
      transaction_count: count(transaction_count), transaction_date,
      model_rate: Number(model.rate),
      fine: money(req.body.fine ?? admin_fee, 'Denda'),
      cash_advance: money(req.body.cash_advance, 'Cash Advance'),
      agent_fee_per_trx: Math.min(Number(model.agent_fee_flat || 0), Number(model.rate)),
      notes: description || null, created_by: req.user?.userId || req.user?.id || null
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(error.status || (error.code === '23503' ? 409 : 500)).json({
      success: false,
      message: error.status ? error.message : (error.code === '23503' ? 'Transaksi memiliki riwayat pembayaran dan tidak dapat dihapus' : 'Server error'),
      error: error.message
    });
  }
};


/**
 * Get client KPI summary
 */
exports.getClientKpis = async (req, res) => {
  try {
    await ensurePayrollSchema();
    const result = await db.query(`SELECT COUNT(DISTINCT client_name) AS total_clients,
      (SELECT COALESCE(SUM(amount),0) FROM client_payments WHERE voided_at IS NULL) AS total_revenue FROM transactions`);
    const topClientResult = await db.query(`SELECT t.client_name, SUM(p.amount) AS total_revenue
      FROM client_payments p JOIN transactions t ON t.id=p.transaction_id WHERE p.voided_at IS NULL
      GROUP BY t.client_name ORDER BY total_revenue DESC LIMIT 1`);

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
    return res.status(error.status || (error.code === '23503' ? 409 : 500)).json({ success: false, message: 'Server error', error: error.message });
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
      data: await require('../utils/receipts').attach(transactions),
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(error.status || (error.code === '23503' ? 409 : 500)).json({
      success: false,
      message: error.status ? error.message : (error.code === '23503' ? 'Transaksi memiliki riwayat pembayaran dan tidak dapat dihapus' : 'Server error'),
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
          rate: model.rate,
          grade_name: transaction.model_grade_name || model.grade_name || null
        } : null
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(error.status || (error.code === '23503' ? 409 : 500)).json({
      success: false,
      message: error.status ? error.message : (error.code === '23503' ? 'Transaksi memiliki riwayat pembayaran dan tidak dapat dihapus' : 'Server error'),
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
      client_name,
      transaction_count,
      transaction_date,
      description,
      notes,
      admin_fee
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

    await ensurePayrollSchema();
    const name = client_name === undefined ? transaction.client_name : String(client_name).trim();
    const changedClient = name.toLowerCase() !== String(transaction.client_name).trim().toLowerCase();
    const snapshot = changedClient ? await clientSnapshot(name) : {
      client_name: transaction.client_name,
      safety_fee: Number(transaction.safety_fee || 0),
      client_admin_fee: Number(transaction.client_admin_fee || 0),
      other_deduction: Number(transaction.other_deduction || 0)
    };
    const newFine = money(req.body.fine ?? admin_fee ?? transaction.fine ?? transaction.admin_fee, 'Denda');
    const newCash = money(req.body.cash_advance ?? transaction.cash_advance, 'Cash Advance');
    const newCount = count(transaction_count ?? transaction.transaction_count);
    await Transaction.update(id, {
      ...snapshot,
      preserveAmounts: !changedClient && newFine === Number(transaction.fine ?? transaction.admin_fee) && newCash === Number(transaction.cash_advance || 0) && newCount === Number(transaction.transaction_count),
      transaction_date: transaction_date || transaction.transaction_date,
      transaction_count: newCount,
      model_rate: Number(transaction.model_rate),
      fine: newFine,
      cash_advance: newCash,
      agent_fee_per_trx: Number(transaction.agent_fee_per_trx ?? (Number(transaction.agent_fee_total || 0) / Number(transaction.transaction_count))),
      notes: notes ?? description ?? transaction.notes
    });

    const updatedTransaction = await Transaction.findById(id);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(error.status || (error.code === '23503' ? 409 : 500)).json({
      success: false,
      message: error.status ? error.message : (error.code === '23503' ? 'Transaksi memiliki riwayat pembayaran dan tidak dapat dihapus' : 'Server error'),
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
    res.status(error.status || (error.code === '23503' ? 409 : 500)).json({
      success: false,
      message: error.status ? error.message : (error.code === '23503' ? 'Transaksi memiliki riwayat pembayaran dan tidak dapat dihapus' : 'Server error'),
      error: error.message
    });
  }
};
