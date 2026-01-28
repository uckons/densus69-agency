const { Model, Transaction, User } = require('../models');
const {
  calculateTotalRevenue,
  calculateAdminFees,
  calculateNetPayout,
  groupRevenueByModel
} = require('../utils/calculation');

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
    const { status, search } = req.query;

    let models = await Model.findAll();

    // Filter by status
    if (status) {
      models = models.filter(m => m.status === status);
    }

    // Search by name
    if (search) {
      const searchLower = search.toLowerCase();
      models = models.filter(m => 
        m.full_name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: models
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
