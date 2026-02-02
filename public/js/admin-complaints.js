// Admin Complaints Management
let currentPage = 1;
let currentFilters = {
    status: '',
    priority: '',
    search: ''
};

// Load complaints on page load
document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Filter listeners
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentPage = 1;
        loadComplaints();
    });

    document.getElementById('priorityFilter')?.addEventListener('change', (e) => {
        currentFilters.priority = e.target.value;
        currentPage = 1;
        loadComplaints();
    });

    document.getElementById('searchInput')?.addEventListener('input', debounce((e) => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        loadComplaints();
    }, 500));

    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        currentFilters = { status: '', priority: '', search: '' };
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('searchInput').value = '';
        currentPage = 1;
        loadComplaints();
    });
}

// Load complaints from API
async function loadComplaints() {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            ...currentFilters
        });

        const response = await fetch(`/api/complaints?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch complaints');

        const data = await response.json();
        renderComplaints(data.complaints || []);
        renderPagination(data.pagination);
        updateStats(data.stats);
        
    } catch (error) {
        console.error('Error loading complaints:', error);
        showError('Failed to load complaints');
    } finally {
        showLoading(false);
    }
}

// Render complaints table
function renderComplaints(complaints) {
    const tbody = document.getElementById('complaintsTable');
    
    if (!complaints || complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3"></i>
                    <p>No complaints found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = complaints.map(complaint => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">#${complaint.id}</td>
            <td class="px-6 py-4">
                <div class="font-medium">${escapeHtml(complaint.customer_name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(complaint.customer_email || '')}</div>
            </td>
            <td class="px-6 py-4">
                <div class="font-medium">${escapeHtml(complaint.complaint_type || 'General')}</div>
                <div class="text-sm text-gray-500">${truncate(complaint.description, 50)}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(complaint.status)}">
                    ${complaint.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                ${formatDate(complaint.created_at)}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                ${complaint.resolved_at ? formatDate(complaint.resolved_at) : '-'}
            </td>
            <td class="px-6 py-4">
                <div class="flex space-x-2">
                    <button onclick="viewComplaint(${complaint.id})" 
                        class="text-blue-600 hover:text-blue-800" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${complaint.status === 'pending' ? `
                        <button onclick="resolveComplaint(${complaint.id})" 
                            class="text-green-600 hover:text-green-800" title="Resolve">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : ''}
                    <button onclick="deleteComplaint(${complaint.id})" 
                        class="text-red-600 hover:text-red-800" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// View complaint details
async function viewComplaint(id) {
    try {
        const response = await fetch(`/api/complaints/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch complaint');

        const complaint = await response.json();
        showComplaintModal(complaint);
        
    } catch (error) {
        console.error('Error viewing complaint:', error);
        showError('Failed to load complaint details');
    }
}

// Show complaint modal
function showComplaintModal(complaint) {
    const modal = document.getElementById('complaintModal');
    document.getElementById('modalComplaintId').textContent = `#${complaint.id}`;
    document.getElementById('modalCustomerName').textContent = complaint.customer_name;
    document.getElementById('modalCustomerEmail').textContent = complaint.customer_email || '-';
    document.getElementById('modalCustomerPhone').textContent = complaint.customer_phone || '-';
    document.getElementById('modalComplaintType').textContent = complaint.complaint_type || 'General';
    document.getElementById('modalDescription').textContent = complaint.description;
    document.getElementById('modalStatus').innerHTML = `
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(complaint.status)}">
            ${complaint.status}
        </span>
    `;
    document.getElementById('modalCreatedAt').textContent = formatDateTime(complaint.created_at);
    document.getElementById('modalResolvedAt').textContent = complaint.resolved_at ? formatDateTime(complaint.resolved_at) : '-';
    document.getElementById('modalAdminResponse').textContent = complaint.admin_response || 'No response yet';
    
    // Show/hide resolve button
    const resolveBtn = document.getElementById('modalResolveBtn');
    if (complaint.status === 'pending') {
        resolveBtn.style.display = 'block';
        resolveBtn.onclick = () => {
            modal.classList.add('hidden');
            resolveComplaint(complaint.id);
        };
    } else {
        resolveBtn.style.display = 'none';
    }
    
    modal.classList.remove('hidden');
}

// Resolve complaint
async function resolveComplaint(id) {
    const response = prompt('Enter admin response (optional):');
    if (response === null) return;

    try {
        const res = await fetch(`/api/complaints/${id}/resolve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ admin_response: response })
        });

        if (!res.ok) throw new Error('Failed to resolve complaint');

        showSuccess('Complaint resolved successfully');
        loadComplaints();
        
    } catch (error) {
        console.error('Error resolving complaint:', error);
        showError('Failed to resolve complaint');
    }
}

// Delete complaint
async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint?')) return;

    try {
        const response = await fetch(`/api/complaints/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete complaint');

        showSuccess('Complaint deleted successfully');
        loadComplaints();
        
    } catch (error) {
        console.error('Error deleting complaint:', error);
        showError('Failed to delete complaint');
    }
}

// Update stats
function updateStats(stats) {
    if (!stats) return;
    
    document.getElementById('pendingCount').textContent = stats.pending || 0;
    document.getElementById('inProgressCount').textContent = stats.inProgress || 0;
    document.getElementById('resolvedCount').textContent = stats.resolved || 0;
    document.getElementById('totalCount').textContent = stats.total || 0;
}

// Render pagination
function renderPagination(pagination) {
    if (!pagination) return;
    
    const container = document.getElementById('pagination');
    const { currentPage: page, totalPages, hasNext, hasPrev } = pagination;
    
    container.innerHTML = `
        <button ${!hasPrev ? 'disabled' : ''} 
            onclick="changePage(${page - 1})"
            class="px-4 py-2 border rounded ${!hasPrev ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}">
            Previous
        </button>
        <span class="px-4 py-2">Page ${page} of ${totalPages}</span>
        <button ${!hasNext ? 'disabled' : ''} 
            onclick="changePage(${page + 1})"
            class="px-4 py-2 border rounded ${!hasNext ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}">
            Next
        </button>
    `;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadComplaints();
}

// Utility functions
function getStatusClass(status) {
    const classes = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'in_progress': 'bg-blue-100 text-blue-800',
        'resolved': 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    alert(message); // Replace with toast notification
}

function showError(message) {
    alert('Error: ' + message); // Replace with toast notification
}

// Close modal
document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('complaintModal').classList.add('hidden');
});
