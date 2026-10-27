const Payroll = require('../public/js/payroll');

// Client safety/admin rates apply per TRX; other deductions apply once.
const calculateSalary = (transactionCount, modelRate, fine = 0, agentFeeFlat = 0, clientFees = {}) => {
  const values = Payroll.calculate({ transaction_count: transactionCount, model_rate: modelRate,
    fine, agent_fee_per_trx: agentFeeFlat, ...clientFees });
  return { ...values, grossAmount: values.gross, adminFee: values.admin, agentFee: values.agent, netAmount: values.net };
};

/**
 * Calculate total revenue for a period
 */
const calculateTotalRevenue = (transactions) => {
  return transactions.reduce((total, transaction) => {
    return total + parseFloat(transaction.gross_amount || 0);
  }, 0);
};

/**
 * Calculate admin fees collected
 */
const calculateAdminFees = (transactions) => {
  return transactions.reduce((total, transaction) => {
    return total + parseFloat(transaction.admin_fee || 0);
  }, 0);
};

/**
 * Calculate net payout to models
 */
const calculateNetPayout = (transactions) => {
  return transactions.reduce((total, transaction) => {
    return total + parseFloat(transaction.net_amount || 0);
  }, 0);
};

/**
 * Group revenue by model
 */
const groupRevenueByModel = (transactions) => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const modelId = transaction.model_id;
    if (!grouped[modelId]) {
      grouped[modelId] = {
        modelId,
        modelName: transaction.model_name || 'Unknown',
        totalRevenue: 0,
        totalTransactions: 0,
        netEarnings: 0
      };
    }
    
    grouped[modelId].totalRevenue += parseFloat(transaction.gross_amount || 0);
    grouped[modelId].totalTransactions += parseInt(transaction.transaction_count || 0);
    grouped[modelId].netEarnings += parseFloat(transaction.net_amount || 0);
  });
  
  return Object.values(grouped);
};

module.exports = {
  calculateSalary,
  calculateTotalRevenue,
  calculateAdminFees,
  calculateNetPayout,
  groupRevenueByModel
};
