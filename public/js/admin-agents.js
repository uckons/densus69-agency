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

function renderAgentsTable(agents) {
    const tbody = document.getElementById('agentsTable');
    if (!agents.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">No agents found</td></tr>`;
        return;
    }
    tbody.innerHTML = agents.map(a => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3">${a.id}</td>
            <td class="px-4 py-3">${a.full_name || a.name}</td>
            <td class="px-4 py-3">${a.email}</td>
            <td class="px-4 py-3">${a.phone || '-'}</td>
            <td class="px-4 py-3 flex space-x-2">
                <button class="text-blue-600 hover:text-blue-800" onclick="showEditAgentModal(${a.id}, '${(a.full_name || a.name).replace(/'/g, "\\'")}', '${a.email}', '${a.phone || ''}')"><i class="fas fa-edit"></i></button>
                <button class="text-red-600 hover:text-red-800" onclick="deleteAgent(${a.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
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
    const full_name = document.getElementById('agentName').value;
    const email = document.getElementById('agentEmail').value;
    const password = document.getElementById('agentPassword').value;
    const phone = document.getElementById('agentPhone').value;
    
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
    } catch (error) {
        alert('Failed to add agent: ' + error.message);
    }
}

async function updateAgent() {
    const id = document.getElementById('agentId').value;
    const full_name = document.getElementById('agentName').value;
    const email = document.getElementById('agentEmail').value;
    const phone = document.getElementById('agentPhone').value;
    const password = document.getElementById('agentPassword').value;  // Optional for update
    
    if (!id || !full_name || !email) {
        return alert('Name and Email are required');
    }
    
    const payload = { full_name, email, phone };
    
    // Only include password if provided
    if (password && password.trim() !== '') {
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
    } catch (error) {
        alert('Failed to update agent: ' + error.message);
    }
}

window.deleteAgent = async function (id) {
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
};