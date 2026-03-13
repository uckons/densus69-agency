let currentUsers = [];
const selectedUserIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    document.getElementById('addUserBtn').onclick = showAddUserModal;
    document.getElementById('closeUserModal').onclick = closeUserModal;
    document.getElementById('bulkDeleteBtn').onclick = bulkDeleteUsers;

    document.getElementById('selectAllUsers').addEventListener('change', (event) => {
        const checked = event.target.checked;

        if (checked) {
            currentUsers.forEach((user) => selectedUserIds.add(user.id));
        } else {
            selectedUserIds.clear();
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
            const user = currentUsers.find((item) => item.id === id);
            if (user) {
                showEditUserModal(user.id, user.email, user.role);
            }
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
        if (checkbox.checked) {
            selectedUserIds.add(id);
        } else {
            selectedUserIds.delete(id);
        }

        syncSelectAllCheckbox();
        updateBulkDeleteState();
    });
});

function getToken() {
    return localStorage.getItem('token');
}

async function loadUsers() {
    try {
        const data = await fetch('/api/admin/users', {
            headers: { Authorization: `Bearer ${getToken()}` }
        }).then((res) => res.json());

        currentUsers = data.users || [];
        selectedUserIds.clear();
        renderUsersTable(currentUsers);
        syncSelectAllCheckbox();
        updateBulkDeleteState();
    } catch (err) {
        alert('Error loading users');
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTable');

    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500">No users found</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map((u) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">
                <input type="checkbox" class="h-4 w-4 user-checkbox" value="${u.id}">
            </td>
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
    const total = currentUsers.length;
    const selected = selectedUserIds.size;

    if (total === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }

    selectAll.checked = selected > 0 && selected === total;
    selectAll.indeterminate = selected > 0 && selected < total;
}

function formatDate(str) {
    return str ? new Date(str).toLocaleString('en-US') : '-';
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
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, role, password })
        });
        if (!res.ok) throw new Error('Failed');
        closeUserModal();
        loadUsers();
        alert('User added');
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
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, role })
        });
        if (!res.ok) throw new Error('Failed');
        closeUserModal();
        loadUsers();
        alert('User updated');
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
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed');

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
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed');
        loadUsers();
        alert('User deleted');
    } catch {
        alert('Failed to delete user');
    }
};
