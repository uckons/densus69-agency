document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    document.getElementById('addUserBtn').onclick = showAddUserModal;
    document.getElementById('closeUserModal').onclick = closeUserModal;
});

function getToken() {
    return localStorage.getItem('token');
}

// Load User List
// Load User List
async function loadUsers() {
    try {
        const data = await fetch('/api/admin/users', {
            headers: { Authorization: 'Bearer ' + getToken() }
        }).then(res => res.json());
        renderUsersTable(data.users || []);
    } catch (err) {
        alert('Error loading users');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">No users found</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${u.id}</td>
            <td class="px-4 py-3">${u.email}</td>
            <td class="px-4 py-3">${u.role}</td>
            <td class="px-4 py-3">${formatDate(u.created_at)}</td>
            <td class="px-4 py-3 flex space-x-2">
                <button class="text-blue-600 hover:text-blue-800" onclick="showEditUserModal(${u.id}, '${u.email}', '${u.role}')"><i class="fas fa-edit"></i></button>
                <button class="text-red-600 hover:text-red-800" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
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
    document.getElementById('userPassword').value = '';
    
    document.getElementById('modalTitle').textContent = type === 'add' ? 'Add User' : 'Edit User';
    document.getElementById('userModalAction').onclick = type === 'add' ? addUser : updateUser;
    
    // Show/hide password helper text and required indicator
    const passwordInput = document.getElementById('userPassword');
    const passwordOptionalText = document.getElementById('passwordOptionalText');
    const passwordRequiredText = document.getElementById('passwordRequiredText');
    const passwordHelpText = document.getElementById('passwordHelpText');
    
    if (type === 'add') {
        // Add mode: password is required
        passwordInput.required = true;
        passwordOptionalText.classList.add('hidden');
        passwordRequiredText.classList.remove('hidden');
        passwordHelpText.classList.add('hidden');
    } else {
        // Edit mode: password is optional
        passwordInput.required = false;
        passwordOptionalText.classList.remove('hidden');
        passwordRequiredText.classList.add('hidden');
        passwordHelpText.classList.remove('hidden');
    }
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
                'Authorization': `Bearer ${getToken()}`,
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
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value.trim();
    
    if (!id || !email || !role) {
        return alert('Email and Role are required');
    }
    
    const payload = { email, role };
    
    // Only include password if provided
    if (password) {
        if (password.length < 6) {
            return alert('Password must be at least 6 characters');
        }
        payload.password = password;
    }
    
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Failed to update user');
        }
        
        closeUserModal();
        loadUsers();
        alert('User updated successfully');
    } catch (error) {
        alert('Failed to update user: ' + error.message);
    }
}

window.deleteUser = async function (id) {
    if (!confirm('Delete this user?')) return;
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed');
        loadUsers();
        alert('User deleted');
    } catch {
        alert('Failed to delete user');
    }
};
