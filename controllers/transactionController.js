const { Transaction, Model } = require('../models');
const { calculateSalary } = require('../utils/calculation');

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      model_id,
      transaction_count,
      transaction_date,
      description
    } = req.body;

    // Validate required fields
    if (!model_id || !transaction_count || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
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

    if (model.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Model is not active'
      });
    }

    if (!model.rate || model.rate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Model rate not set'
      });
    }

    // Calculate amounts
    const { grossAmount, adminFee, netAmount } = calculateSalary(
      parseInt(transaction_count),
      parseFloat(model.rate)
    );

    // Create transaction
    const transaction = await Transaction.create({
      model_id,
      transaction_count: parseInt(transaction_count),
      transaction_date,
      gross_amount: grossAmount,
      admin_fee: adminFee,
      net_amount: netAmount,
      description: description || null
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
