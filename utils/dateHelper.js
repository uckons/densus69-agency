/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format datetime to readable string
 */
const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get date range for filters
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;
  
  switch(period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
      
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
      break;
      
    case 'month':
      startDate = new Date(now.setDate(now.getDate() - 30));
      endDate = new Date();
      break;
      
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      endDate = new Date();
      break;
      
    default:
      startDate = new Date(now.setDate(now.getDate() - 30));
      endDate = new Date();
  }
  
  return { startDate, endDate };
};

/**
 * Get first and last day of current month
 */
const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return { firstDay, lastDay };
};

/**
 * Format currency (Indonesian Rupiah)
 */
const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0';
  return 'Rp ' + parseFloat(amount).toLocaleString('id-ID');
};

module.exports = {
  formatDate,
  formatDateTime,
  getDateRange,
  getCurrentMonthRange,
  formatCurrency
};
