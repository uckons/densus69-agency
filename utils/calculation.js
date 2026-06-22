/**
 * Calculate salary for a transaction
 * Formula: (Transaction Count × Model Rate) - Admin Fee - (Agent Flat Fee × Transaction Count)
 */
const calculateSalary = (transactionCount, modelRate, adminFee = 50000, agentFeeFlat = 0) => {
  const safeTransactionCount = Number(transactionCount || 0);
  const safeModelRate = Number(modelRate || 0);
  const safeAdminFee = Number(adminFee || 0);
  const safeAgentFeeFlat = Number(agentFeeFlat || 0);
  const grossAmount = safeTransactionCount * safeModelRate;
  const totalAgentFee = safeTransactionCount * Math.min(safeAgentFeeFlat, safeModelRate);
  const netAmount = Math.max(grossAmount - safeAdminFee - totalAgentFee, 0);
  
  return {
    grossAmount,
    adminFee: safeAdminFee,
    agentFee: totalAgentFee,
    netAmount
  };
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
