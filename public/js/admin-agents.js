document.addEventListener('DOMContentLoaded', () => {
    loadAgents();
    document.getElementById('addAgentBtn').onclick = showAddAgentModal;
    document.getElementById('closeAgentModal').onclick = closeAgentModal;
});

function getToken() {
    return localStorage.getItem('token');
}

// Load all agents
async function loadAgents() {
    try {
        const res = await fetch('/api/admin/agents', {
            headers: { Authorization: 'Bearer ' + getToken() }
        });
        const data = await res.json();
        renderAgentsTable(data.agents || []);
    } catch {
        alert('Error loading agents');
    }
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function renderAgentsTable(agents) {
    const tbody = document.getElementById('agentsTable');
    if (!agents.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">No agents found</td></tr>`;
        return;
    }
    tbody.innerHTML = agents.map(a => {
        const name = escapeHtml(a.full_name || a.name);
        const email = escapeHtml(a.email);
        const phone = escapeHtml(a.phone || '-');
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${a.id}</td>
            <td class="px-4 py-3">${name}</td>
            <td class="px-4 py-3">${email}</td>
            <td class="px-4 py-3">${phone}</td>
            <td class="px-4 py-3 flex space-x-2">
                <button class="text-blue-600 hover:text-blue-800 edit-agent-btn" data-id="${a.id}" data-name="${a.full_name || a.name || ''}" data-email="${a.email || ''}" data-phone="${a.phone || ''}"><i class="fas fa-edit"></i></button>
                <button class="text-red-600 hover:text-red-800 delete-agent-btn" data-id="${a.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
    }).join('');
    
    // Attach event listeners to buttons
    document.querySelectorAll('.edit-agent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const email = this.getAttribute('data-email');
            const phone = this.getAttribute('data-phone');
            window.showEditAgentModal(id, name, email, phone);
        });
    });
    
    document.querySelectorAll('.delete-agent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteAgent(id);
        });
    });
}

window.showAddAgentModal = function () {
    setAgentModal({ id: '', name: '', email: '', phone: '', type: 'add' });
    document.getElementById('agentModal').classList.remove('hidden');
};

window.showEditAgentModal = function (id, name, email, phone) {
    setAgentModal({ id, name, email, phone, type: 'edit' });
    document.getElementById('agentModal').classList.remove('hidden');
};

window.closeAgentModal = function () {
    document.getElementById('agentModal').classList.add('hidden');
};

function setAgentModal({ id, name, email, phone, type }) {
    document.getElementById('agentId').value = id;
    document.getElementById('agentName').value = name;
    document.getElementById('agentEmail').value = email;
    document.getElementById('agentPhone').value = phone;
    document.getElementById('agentPassword').value = '';  // Clear password
    document.getElementById('agentModalTitle').textContent = type === 'add' ? 'Add Agent' : 'Edit Agent';
    
    // Show password field only when adding new agent
    const passwordField = document.getElementById('passwordField');
    if (type === 'add') {
        passwordField.classList.remove('hidden');
    } else {
        passwordField.classList.add('hidden');
    }
    
    document.getElementById('agentModalAction').onclick = type === 'add' ? addAgent : updateAgent;
}

async function addAgent() {
    const full_name = document.getElementById('agentName').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const password = document.getElementById('agentPassword').value;  // Don't trim passwords
    const phone = document.getElementById('agentPhone').value.trim();
    
    // Validation
    if (!full_name || !email || !password) {
        return alert('Name, Email, and Password are required');
    }
    
    if (password.length < 6) {
        return alert('Password must be at least 6 characters');
    }
    
    try {
        const res = await fetch('/api/admin/agents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ full_name, email, password, phone })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Failed to add agent');
        }
        
        closeAgentModal();
        loadAgents();
        alert('Agent added successfully');
        // Replace history state to prevent form resubmission on page refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        alert('Failed to add agent: ' + error.message);
    }
}

async function updateAgent() {
    const id = document.getElementById('agentId').value;
    const full_name = document.getElementById('agentName').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const phone = document.getElementById('agentPhone').value.trim();
    const password = document.getElementById('agentPassword').value;  // Don't trim passwords
    
    if (!id || !full_name || !email) {
        return alert('Name and Email are required');
    }
    
    const payload = { full_name, email, phone };
    
    // Only include password if provided
    if (password) {
        if (password.length < 6) {
            return alert('Password must be at least 6 characters');
        }
        payload.password = password;
    }
    
    try {
        const res = await fetch(`/api/admin/agents/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Failed to update agent');
        }
        
        closeAgentModal();
        loadAgents();
        alert('Agent updated successfully');
        // Replace history state to prevent form resubmission on page refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        alert('Failed to update agent: ' + error.message);
    }
}

// Delete agent function
async function deleteAgent(id) {
    if (!confirm('Delete this agent?')) return;
    try {
        const res = await fetch(`/api/admin/agents/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed');
        loadAgents();
        alert('Agent deleted');
    } catch {
        alert('Failed to delete agent');
    }
}

// Expose to window scope for backward compatibility
window.deleteAgent = deleteAgent;