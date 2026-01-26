/**
 * Main JavaScript - Common utilities used across all pages
 */

// Toast notification system
const toastContainer = (() => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(container);
  }
  return container;
})();

/**
 * Display toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showToast(message, type = 'info', duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast-notification transform transition-all duration-300 translate-x-0 opacity-100 
    px-6 py-4 rounded-lg shadow-lg max-w-md flex items-center justify-between gap-3`;
  
  const bgColors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.className += ` ${bgColors[type] || bgColors.info}`;
  
  toast.innerHTML = `
    <div class="flex items-center gap-3 flex-1">
      <span class="text-2xl font-bold">${icons[type] || icons.info}</span>
      <span class="text-sm font-medium">${message}</span>
    </div>
    <button class="toast-close text-white hover:opacity-75 text-xl font-bold" aria-label="Close">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  const closeBtn = toast.querySelector('.toast-close');
  const closeToast = () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  };
  
  closeBtn.addEventListener('click', closeToast);
  
  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: IDR)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'IDR') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type (short, long, time, datetime)
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'short') {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const options = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  };
  
  return new Intl.DateTimeFormat('id-ID', options[format] || options.short).format(d);
}

/**
 * AJAX wrapper with error handling
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'same-origin'
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * GET request wrapper
 */
async function apiGet(url) {
  return apiRequest(url, { method: 'GET' });
}

/**
 * POST request wrapper
 */
async function apiPost(url, data) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT request wrapper
 */
async function apiPut(url, data) {
  return apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request wrapper
 */
async function apiDelete(url) {
  return apiRequest(url, { method: 'DELETE' });
}

/**
 * Show loading state on element
 * @param {HTMLElement} element - Element to show loading state
 * @param {boolean} show - Show or hide loading state
 */
function toggleLoading(element, show = true) {
  if (!element) return;
  
  if (show) {
    element.disabled = true;
    element.dataset.originalText = element.innerHTML;
    element.innerHTML = `
      <svg class="animate-spin h-5 w-5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-2">Loading...</span>
    `;
  } else {
    element.disabled = false;
    if (element.dataset.originalText) {
      element.innerHTML = element.dataset.originalText;
      delete element.dataset.originalText;
    }
  }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 flex flex-col items-center">
        <svg class="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-gray-700 font-medium">Loading...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * Confirm dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User's choice
 */
function confirmDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Confirm Action</h3>
        <p class="text-gray-700 mb-6">${message}</p>
        <div class="flex justify-end gap-3">
          <button class="cancel-btn px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
            Cancel
          </button>
          <button class="confirm-btn px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Confirm
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const cleanup = () => dialog.remove();
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

/**
 * Logout functionality
 */
async function handleLogout() {
  const confirmed = await confirmDialog('Are you sure you want to logout?');
  if (!confirmed) return;
  
  try {
    showLoadingOverlay();
    await apiPost('/api/auth/logout');
    window.location.href = '/login';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Logout failed. Please try again.', 'error');
  }
}

// Initialize common event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Logout button handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
  
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    }
  });
  
  // Auto-dismiss alerts after 5 seconds
  document.querySelectorAll('.alert-auto-dismiss').forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });
});

// Handle AJAX errors globally
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (event.reason && event.reason.message) {
    if (event.reason.message.includes('401') || event.reason.message.includes('Unauthorized')) {
      showToast('Session expired. Please login again.', 'warning');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }
});
