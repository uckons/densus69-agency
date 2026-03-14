let allUsers = [];
let filteredUsers = [];
const selectedUserIds = new Set();
let currentPage = 1;
let perPage = 10;

function getToken() {
    return localStorage.getItem('token');
}

function buildAuthHeaders(extra = {}) {
    const token = getToken();
    return token
        ? { ...extra, Authorization: `Bearer ${token}` }
        : { ...extra };
}

async function parseJsonSafe(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (_) {
        return { message: text || 'Unknown server response' };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    document.getElementById('addUserBtn').onclick = showAddUserModal;
    document.getElementById('closeUserModal').onclick = closeUserModal;
    document.getElementById('bulkDeleteBtn').onclick = bulkDeleteUsers;

    document.getElementById('userSearchInput').addEventListener('input', () => {
        currentPage = 1;
        applyFiltersAndRender();
    });

    document.getElementById('usersPerPage').addEventListener('change', (event) => {
        perPage = parseInt(event.target.value, 10) || 10;
        currentPage = 1;
        applyFiltersAndRender();
    });

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderUsersTable();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        const totalPages = getTotalPages();
        if (currentPage < totalPages) {
            currentPage += 1;
            renderUsersTable();
        }
    });

    document.getElementById('selectAllUsers').addEventListener('change', (event) => {
        const checked = event.target.checked;
        const pageUsers = getCurrentPageUsers();

        if (checked) {
            pageUsers.forEach((user) => selectedUserIds.add(user.id));
        } else {
            pageUsers.forEach((user) => selectedUserIds.delete(user.id));
        }

        document.querySelectorAll('.user-checkbox').forEach((checkbox) => {
            checkbox.checked = checked;
        });

        updateBulkDeleteState();
    });

    document.getElementById('usersTable').addEventListener('click', (event) => {
        const editButton = event.target.closest('.edit-user-btn');
        const deleteButton = event.target.closest('.delete-user-btn');

        if (editButton) {
            const id = parseInt(editButton.dataset.id, 10);
            const user = allUsers.find((item) => item.id === id);
            if (user) showEditUserModal(user.id, user.email, user.role);
            return;
        }

        if (deleteButton) {
            const id = parseInt(deleteButton.dataset.id, 10);
            deleteUser(id);
        }
    });

    document.getElementById('usersTable').addEventListener('change', (event) => {
        const checkbox = event.target.closest('.user-checkbox');
        if (!checkbox) return;

        const id = parseInt(checkbox.value, 10);
        if (checkbox.checked) selectedUserIds.add(id);
        else selectedUserIds.delete(id);

        syncSelectAllCheckbox();
        updateBulkDeleteState();
    });
});

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include',
            headers: buildAuthHeaders()
        });

        const data = await parseJsonSafe(response);
        if (!response.ok || data.success === false) {
            throw new Error(data.message || 'Failed to load users');
        }

        allUsers = data.users || [];
        selectedUserIds.clear();
        applyFiltersAndRender();
    } catch (err) {
        alert(err.message || 'Error loading users');
    }
}

function applyFiltersAndRender() {
    const q = (document.getElementById('userSearchInput').value || '').trim().toLowerCase();

    filteredUsers = allUsers.filter((u) => {
        if (!q) return true;
        return (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q) || String(u.id).includes(q);
    });

    const totalPages = getTotalPages();
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    renderUsersTable();
}

function getTotalPages() {
    return Math.max(1, Math.ceil(filteredUsers.length / perPage));
}

function getCurrentPageUsers() {
    const start = (currentPage - 1) * perPage;
    return filteredUsers.slice(start, start + perPage);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTable');
    const pageUsers = getCurrentPageUsers();

    if (!pageUsers.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500">No users found</td></tr>`;
    } else {
        tbody.innerHTML = pageUsers.map((u) => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3"><input type="checkbox" class="h-4 w-4 user-checkbox" value="${u.id}" ${selectedUserIds.has(u.id) ? 'checked' : ''}></td>
                <td class="px-4 py-3">${u.id}</td>
                <td class="px-4 py-3 break-all">${escapeHtml(u.email)}</td>
                <td class="px-4 py-3">${escapeHtml(u.role)}</td>
                <td class="px-4 py-3">${formatDate(u.created_at)}</td>
                <td class="px-4 py-3 flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800 edit-user-btn" data-id="${u.id}"><i class="fas fa-edit"></i></button>
                    <button class="text-red-600 hover:text-red-800 delete-user-btn" data-id="${u.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    updatePaginationInfo();
    syncSelectAllCheckbox();
    updateBulkDeleteState();
}

function updatePaginationInfo() {
    const totalPages = getTotalPages();
    const total = filteredUsers.length;
    const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, total);

    document.getElementById('pageInfo').textContent = `Page ${currentPage} / ${totalPages}`;
    document.getElementById('usersSummary').textContent = total === 0
        ? 'No matching users'
        : `Showing ${start}-${end} of ${total} users`;

    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function updateBulkDeleteState() {
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const count = selectedUserIds.size;

    bulkDeleteBtn.disabled = count === 0;
    bulkDeleteBtn.innerHTML = count > 0
        ? `<i class="fas fa-trash-alt mr-2"></i>Delete Selected (${count})`
        : '<i class="fas fa-trash-alt mr-2"></i>Delete Selected';
}

function syncSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAllUsers');
    const pageUsers = getCurrentPageUsers();

    if (pageUsers.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }

    const selectedOnPage = pageUsers.filter((u) => selectedUserIds.has(u.id)).length;
    selectAll.checked = selectedOnPage === pageUsers.length;
    selectAll.indeterminate = selectedOnPage > 0 && selectedOnPage < pageUsers.length;
}

function formatDate(str) {
    return str ? new Date(str).toLocaleString('id-ID') : '-';
}

window.showAddUserModal = function () {
    setUserModal({ id: '', email: '', role: 'model', password: '', type: 'add' });
    document.getElementById('userModal').classList.remove('hidden');
};

window.showEditUserModal = function (id, email, role) {
    setUserModal({ id, email, role, password: '', type: 'edit' });
    document.getElementById('userModal').classList.remove('hidden');
};

window.closeUserModal = function () {
    document.getElementById('userModal').classList.add('hidden');
};

function setUserModal({ id, email, role, password, type }) {
    document.getElementById('userId').value = id;
    document.getElementById('userEmail').value = email;
    document.getElementById('userRole').value = role;
    document.getElementById('userPassword').value = password;
    document.getElementById('modalTitle').textContent = type === 'add' ? 'Add User' : 'Edit User';
    document.getElementById('userModalAction').onclick = type === 'add' ? addUser : updateUser;
    document.getElementById('userPasswordRow').style.display = type === 'edit' ? 'none' : '';
}

async function addUser() {
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    if (!email || !role || !password) return alert('Email, Role, and Password required');

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            credentials: 'include',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, role, password })
        });

        const result = await parseJsonSafe(res);
        if (!res.ok || result.success === false) throw new Error(result.message || 'Failed');
        closeUserModal();
        loadUsers();
        alert(result.message || 'User added');
    } catch {
        alert('Failed to add user');
    }
}

async function updateUser() {
    const id = document.getElementById('userId').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    if (!id || !email || !role) return alert('Email and Role required');

    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, role })
        });

        const result = await parseJsonSafe(res);
        if (!res.ok || result.success === false) throw new Error(result.message || 'Failed');
        closeUserModal();
        loadUsers();
        alert(result.message || 'User updated');
    } catch {
        alert('Failed to update user');
    }
}

async function bulkDeleteUsers() {
    if (selectedUserIds.size === 0) return;
    if (!confirm(`Delete ${selectedUserIds.size} selected users?`)) return;

    try {
        const res = await fetch('/api/admin/users/bulk-delete', {
            method: 'DELETE',
            credentials: 'include',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
        });

        const result = await parseJsonSafe(res);
        if (!res.ok || result.success === false) throw new Error(result.message || 'Failed');

        await loadUsers();
        alert(result.message || 'Selected users deleted');
    } catch (error) {
        alert(error.message || 'Failed to delete selected users');
    }
}

window.deleteUser = async function (id) {
    if (!confirm('Delete this user?')) return;

    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: buildAuthHeaders()
        });

        const result = await parseJsonSafe(res);
        if (!res.ok || result.success === false) throw new Error(result.message || 'Failed');
        loadUsers();
        alert('User deleted');
    } catch {
        alert('Failed to delete user');
    }
};
