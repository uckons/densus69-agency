/**
 * Model Dashboard JavaScript
 * Handles model-specific dashboard, charts, and personal stats
 */

let earningsChart = null;
let transactionCountChart = null;

/**
 * Initialize model dashboard charts
 */
function initializeModelCharts() {
  // Personal Earnings Chart
  const earningsCtx = document.getElementById('earningsChart');
  if (earningsCtx) {
    earningsChart = new Chart(earningsCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Earnings',
          data: [],
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
                return 'Earnings: ' + formatCurrency(context.parsed.y);
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
  
  // Transaction Count Chart
  const transactionCountCtx = document.getElementById('transactionCountChart');
  if (transactionCountCtx) {
    transactionCountChart = new Chart(transactionCountCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Transactions',
          data: [],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

/**
 * Fetch model dashboard data from API
 */
async function fetchModelDashboardData() {
  try {
    showLoadingOverlay();
    
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    let url = '/api/model/dashboard/stats';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += '?' + params.toString();
    
    const data = await apiGet(url);
    
    updateModelStats(data);
    updateModelCharts(data);
    
    hideLoadingOverlay();
    showToast('Dashboard updated successfully', 'success', 3000);
  } catch (error) {
    hideLoadingOverlay();
    console.error('Failed to fetch dashboard data:', error);
    showToast('Failed to load dashboard data: ' + error.message, 'error');
  }
}

/**
 * Update model statistics
 */
function updateModelStats(data) {
  const totalEarningsEl = document.getElementById('total-earnings');
  const totalTransactionsEl = document.getElementById('total-transactions');
  const totalPhotosEl = document.getElementById('total-photos');
  const avgEarningsEl = document.getElementById('avg-earnings');
  const pendingPayoutEl = document.getElementById('pending-payout');
  
  if (totalEarningsEl && data.totalEarnings !== undefined) {
    totalEarningsEl.textContent = formatCurrency(data.totalEarnings);
  }
  
  if (totalTransactionsEl && data.totalTransactions !== undefined) {
    totalTransactionsEl.textContent = data.totalTransactions.toLocaleString('id-ID');
  }
  
  if (totalPhotosEl && data.totalPhotos !== undefined) {
    totalPhotosEl.textContent = data.totalPhotos.toLocaleString('id-ID');
  }
  
  if (avgEarningsEl && data.averageEarnings !== undefined) {
    avgEarningsEl.textContent = formatCurrency(data.averageEarnings);
  }
  
  if (pendingPayoutEl && data.pendingPayout !== undefined) {
    pendingPayoutEl.textContent = formatCurrency(data.pendingPayout);
  }
}

/**
 * Update model charts with new data
 */
function updateModelCharts(data) {
  // Update Earnings Chart
  if (earningsChart && data.earningsTrends) {
    earningsChart.data.labels = data.earningsTrends.map(item => 
      formatDate(item.date, 'short')
    );
    earningsChart.data.datasets[0].data = data.earningsTrends.map(item => item.amount);
    earningsChart.update('none');
  }
  
  // Update Transaction Count Chart
  if (transactionCountChart && data.transactionTrends) {
    transactionCountChart.data.labels = data.transactionTrends.map(item => 
      formatDate(item.date, 'short')
    );
    transactionCountChart.data.datasets[0].data = data.transactionTrends.map(item => item.count);
    transactionCountChart.update('none');
  }
}

/**
 * Setup date filter
 */
function setupModelDateFilter() {
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const applyFilterBtn = document.getElementById('apply-filter-btn');
  const resetFilterBtn = document.getElementById('reset-filter-btn');
  
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      fetchModelDashboardData();
    });
  }
  
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      fetchModelDashboardData();
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
 * Setup quick date range buttons
 */
function setupModelQuickRanges() {
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
      fetchModelDashboardData();
    });
  });
}

/**
 * Setup refresh button
 */
function setupModelRefreshButton() {
  const refreshBtn = document.getElementById('refresh-dashboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchModelDashboardData();
    });
  }
}

/**
 * Load recent transactions
 */
async function loadRecentTransactions() {
  try {
    const transactionsContainer = document.getElementById('recent-transactions');
    if (!transactionsContainer) return;
    
    const data = await apiGet('/api/model/transactions/recent?limit=5');
    
    if (!data.transactions || data.transactions.length === 0) {
      transactionsContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <p>No recent transactions</p>
        </div>
      `;
      return;
    }
    
    transactionsContainer.innerHTML = data.transactions.map(transaction => `
      <div class="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
        <div class="flex-1">
          <p class="font-medium text-gray-900">${transaction.customerName || 'Customer'}</p>
          <p class="text-sm text-gray-500">${formatDate(transaction.createdAt, 'datetime')}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-gray-900">${formatCurrency(transaction.amount)}</p>
          <span class="inline-block px-2 py-1 text-xs rounded-full ${
            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }">
            ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load recent transactions:', error);
  }
}

/**
 * Request payout
 */
async function requestPayout() {
  const confirmed = await confirmDialog('Request a payout for your pending earnings?');
  if (!confirmed) return;
  
  try {
    showLoadingOverlay();
    const result = await apiPost('/api/model/payout/request');
    hideLoadingOverlay();
    
    showToast('Payout request submitted successfully!', 'success');
    fetchModelDashboardData();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Failed to request payout: ' + error.message, 'error');
  }
}

/**
 * Setup payout request button
 */
function setupPayoutButton() {
  const payoutBtn = document.getElementById('request-payout-btn');
  if (payoutBtn) {
    payoutBtn.addEventListener('click', () => {
      requestPayout();
    });
  }
}

// Initialize model dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeModelCharts();
  setupModelDateFilter();
  setupModelQuickRanges();
  setupModelRefreshButton();
  setupPayoutButton();
  
  // Load initial data
  fetchModelDashboardData();
  loadRecentTransactions();
  
  // Auto-refresh every 5 minutes
  setInterval(() => {
    fetchModelDashboardData();
    loadRecentTransactions();
  }, 5 * 60 * 1000);
});
