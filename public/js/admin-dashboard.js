/**
 * Admin Dashboard JavaScript
 * Handles charts, data fetching, and dashboard interactions
 */

let revenueChart = null;
let modelRevenueChart = null;
let transactionStatsChart = null;

/**
 * Initialize all charts
 */
function initializeCharts() {
  // Revenue Trends Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Revenue',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Revenue: ' + formatCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
  }
  
  // Per-Model Revenue Chart
  const modelRevenueCtx = document.getElementById('modelRevenueChart');
  if (modelRevenueCtx) {
    modelRevenueChart = new Chart(modelRevenueCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Revenue per Model',
          data: [],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)'
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(251, 191, 36)',
            'rgb(239, 68, 68)',
            'rgb(139, 92, 246)',
            'rgb(236, 72, 153)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Revenue: ' + formatCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
  }
  
  // Transaction Stats Chart
  const transactionStatsCtx = document.getElementById('transactionStatsChart');
  if (transactionStatsCtx) {
    transactionStatsChart = new Chart(transactionStatsCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Failed'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(251, 191, 36)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

/**
 * Fetch dashboard data from API
 */
async function fetchDashboardData() {
  try {
    showLoadingOverlay();
    
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    let url = '/api/admin/dashboard/stats';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += '?' + params.toString();
    
    const data = await apiGet(url);
    
    updateDashboardStats(data);
    updateCharts(data);
    
    hideLoadingOverlay();
    showToast('Dashboard updated successfully', 'success', 3000);
  } catch (error) {
    hideLoadingOverlay();
    console.error('Failed to fetch dashboard data:', error);
    showToast('Failed to load dashboard data: ' + error.message, 'error');
  }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats(data) {
  // Update stat cards
  const totalRevenueEl = document.getElementById('total-revenue');
  const activeModelsEl = document.getElementById('active-models');
  const totalTransactionsEl = document.getElementById('total-transactions');
  const avgTransactionEl = document.getElementById('avg-transaction');
  
  if (totalRevenueEl && data.totalRevenue !== undefined) {
    totalRevenueEl.textContent = formatCurrency(data.totalRevenue);
  }
  
  if (activeModelsEl && data.activeModels !== undefined) {
    activeModelsEl.textContent = data.activeModels;
  }
  
  if (totalTransactionsEl && data.totalTransactions !== undefined) {
    totalTransactionsEl.textContent = data.totalTransactions.toLocaleString('id-ID');
  }
  
  if (avgTransactionEl && data.averageTransaction !== undefined) {
    avgTransactionEl.textContent = formatCurrency(data.averageTransaction);
  }
}

/**
 * Update all charts with new data
 */
function updateCharts(data) {
  // Update Revenue Trends Chart
  if (revenueChart && data.revenueTrends) {
    revenueChart.data.labels = data.revenueTrends.map(item => 
      formatDate(item.date, 'short')
    );
    revenueChart.data.datasets[0].data = data.revenueTrends.map(item => item.amount);
    revenueChart.update('none');
  }
  
  // Update Model Revenue Chart
  if (modelRevenueChart && data.modelRevenue) {
    modelRevenueChart.data.labels = data.modelRevenue.map(item => item.modelName);
    modelRevenueChart.data.datasets[0].data = data.modelRevenue.map(item => item.revenue);
    modelRevenueChart.update('none');
  }
  
  // Update Transaction Stats Chart
  if (transactionStatsChart && data.transactionStats) {
    transactionStatsChart.data.datasets[0].data = [
      data.transactionStats.completed || 0,
      data.transactionStats.pending || 0,
      data.transactionStats.failed || 0
    ];
    transactionStatsChart.update('none');
  }
}

/**
 * Handle date range filter
 */
function setupDateRangeFilter() {
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const applyFilterBtn = document.getElementById('apply-filter-btn');
  const resetFilterBtn = document.getElementById('reset-filter-btn');
  
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      fetchDashboardData();
    });
  }
  
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      fetchDashboardData();
    });
  }
  
  // Set default date range (last 30 days)
  if (startDateInput && !startDateInput.value) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
  }
  
  if (endDateInput && !endDateInput.value) {
    endDateInput.value = new Date().toISOString().split('T')[0];
  }
}

/**
 * Setup refresh button
 */
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-dashboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchDashboardData();
    });
  }
}

/**
 * Setup quick date range buttons
 */
function setupQuickDateRanges() {
  const quickRangeBtns = document.querySelectorAll('[data-range]');
  
  quickRangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      const startDateInput = document.getElementById('start-date');
      const endDateInput = document.getElementById('end-date');
      
      if (!startDateInput || !endDateInput) return;
      
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      let startDate;
      
      switch (range) {
        case 'today':
          startDate = endDate;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        case 'year':
          const yearAgo = new Date(today);
          yearAgo.setFullYear(today.getFullYear() - 1);
          startDate = yearAgo.toISOString().split('T')[0];
          break;
        default:
          return;
      }
      
      startDateInput.value = startDate;
      endDateInput.value = endDate;
      fetchDashboardData();
    });
  });
}

/**
 * Export dashboard data
 */
async function exportDashboardData(format = 'csv') {
  try {
    showLoadingOverlay();
    
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    let url = `/api/admin/dashboard/export?format=${format}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await fetch(url, { credentials: 'same-origin' });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    hideLoadingOverlay();
    showToast('Dashboard data exported successfully', 'success');
  } catch (error) {
    hideLoadingOverlay();
    console.error('Export failed:', error);
    showToast('Failed to export data: ' + error.message, 'error');
  }
}

/**
 * Setup export buttons
 */
function setupExportButtons() {
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportExcelBtn = document.getElementById('export-excel-btn');
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportDashboardData('csv'));
  }
  
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => exportDashboardData('xlsx'));
  }
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
  setupDateRangeFilter();
  setupRefreshButton();
  setupQuickDateRanges();
  setupExportButtons();
  
  // Load initial data
  fetchDashboardData();
  
  // Auto-refresh every 5 minutes
  setInterval(() => {
    fetchDashboardData();
  }, 5 * 60 * 1000);
});
