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
            <td class="px-4 py-3">${a.name}</td>
            <td class="px-4 py-3">${a.email}</td>
            <td class="px-4 py-3">${a.phone || '-'}</td>
            <td class="px-4 py-3 flex space-x-2">
                <button class="text-blue-600 hover:text-blue-800" onclick="showEditAgentModal(${a.id}, '${a.name}', '${a.email}', '${a.phone || ''}')"><i class="fas fa-edit"></i></button>
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
    document.getElementById('agentModalTitle').textContent = type === 'add' ? 'Add Agent' : 'Edit Agent';
    document.getElementById('agentModalAction').onclick = type === 'add' ? addAgent : updateAgent;
}

async function addAgent() {
    const name = document.getElementById('agentName').value;
    const email = document.getElementById('agentEmail').value;
    const phone = document.getElementById('agentPhone').value;
    if (!name || !email) return alert('Name and Email required');
    try {
        const res = await fetch('/api/admin/agents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });
        if (!res.ok) throw new Error('Failed');
        closeAgentModal();
        loadAgents();
        alert('Agent added');
    } catch {
        alert('Failed to add agent');
    }
}

async function updateAgent() {
    const id = document.getElementById('agentId').value;
    const name = document.getElementById('agentName').value;
    const email = document.getElementById('agentEmail').value;
    const phone = document.getElementById('agentPhone').value;
    if (!id || !name || !email) return alert('Name and Email required');
    try {
        const res = await fetch(`/api/admin/agents/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });
        if (!res.ok) throw new Error('Failed');
        closeAgentModal();
        loadAgents();
        alert('Agent updated');
    } catch {
        alert('Failed to update agent');
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