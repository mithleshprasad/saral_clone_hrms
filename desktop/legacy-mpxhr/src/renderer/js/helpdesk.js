import { escapeHtml } from './utils.js';

export async function loadHelpdesk() {
    const content = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isEmployee = currentUser.role === 'employee';

    content.innerHTML = `
        <div class="header-actions">
            <h1>Helpdesk & Support</h1>
            <div style="display:flex; gap:10px;">
                <input type="text" id="ticket-search" placeholder="Search Tickets..." style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                <button class="erp-btn" onclick="openTicketModal()"><i class="fas fa-plus"></i> Raise Ticket</button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="filterTickets('All')">All Tickets</button>
            <button class="tab-btn" onclick="filterTickets('Open')">Open</button>
            <button class="tab-btn" onclick="filterTickets('Closed')">Closed</button>
        </div>

        <div class="table-container fade-in">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Requested By</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="ticket-list"></tbody>
            </table>
        </div>
    `;

    // Load Tickets
    window.refreshTickets = async () => {
        try {
            const tickets = await window.electronAPI.getTickets({
                employeeId: currentUser.employeeId,
                role: currentUser.role
            });
            window.allTickets = tickets; // Cache for filtering
            renderTickets(tickets);
        } catch (e) {
            console.error("Load Tickets Error", e);
            document.getElementById('ticket-list').innerHTML = '<tr><td colspan="8">Error loading tickets.</td></tr>';
        }
    };

    window.filterTickets = (status) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');

        if (status === 'All') renderTickets(window.allTickets);
        else renderTickets(window.allTickets.filter(t => t.status === status || (status === 'Closed' && t.status === 'Resolved')));
    };

    function renderTickets(tickets) {
        const tbody = document.getElementById('ticket-list');
        if (tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No tickets found.</td></tr>';
            return;
        }

        tbody.innerHTML = tickets.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td style="font-weight:600;">${escapeHtml(t.subject)}</td>
                <td>${escapeHtml(t.category)}</td>
                <td><span class="badge ${getPriorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td><span class="status-badge ${t.status.toLowerCase().replace(' ', '-')}">${escapeHtml(t.status)}</span></td>
                <td>${t.first_name ? escapeHtml(t.first_name) + ' ' + escapeHtml(t.last_name) : 'Me'}</td>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                    ${!isEmployee && t.status !== 'Resolved' && t.status !== 'Closed' ?
                `<button class="btn-sm success" onclick="updateTicket(${t.id}, 'Resolved')">Resolve</button>` : ''}
                    ${!isEmployee && t.status === 'Open' ?
                `<button class="btn-sm" onclick="updateTicket(${t.id}, 'In Progress')">WIP</button>` : ''}
                     <button class="icon-btn" onclick="viewTicket(${t.id})" title="Details">👁️</button>
                </td>
            </tr>
        `).join('');
    }

    function getPriorityClass(p) {
        if (p === 'High') return 'badge-danger';
        if (p === 'Medium') return 'badge-warning';
        return 'badge-neutral';
    }

    window.openTicketModal = () => {
        const html = `
            <div id="modal-ticket" class="modal">
                <div class="modal-content glass-panel">
                    <div class="modal-header">
                        <h2>Raise New Ticket</h2>
                        <span class="close-modal" onclick="document.getElementById('modal-ticket').remove()">&times;</span>
                    </div>
                    <form onsubmit="submitTicket(event)">
                        <div class="form-group">
                            <label>Category</label>
                            <select name="category" required>
                                <option>IT Support</option>
                                <option>HR Query</option>
                                <option>Payroll Issue</option>
                                <option>Facility / Admin</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select name="priority">
                                <option>Low</option>
                                <option selected>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Subject</label>
                            <input type="text" name="subject" placeholder="Brief Summary" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea name="description" rows="4" placeholder="Detailed explanation..." required></textarea>
                        </div>
                        <button class="erp-btn" style="width:100%; margin-top:10px;">Submit Ticket</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.submitTicket = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.employee_id = currentUser.employeeId;

        try {
            await window.electronAPI.createTicket(data);
            document.getElementById('modal-ticket').remove();
            window.showToast("Ticket raised successfully!", 'success');
            refreshTickets();
        } catch (err) {
            window.showToast("Error: " + err.message, 'error');
        }
    };

    window.updateTicket = async (id, status) => {
        if (confirm(`Mark ticket #${id} as ${status}?`)) {
            await window.electronAPI.updateTicketStatus({ id, status });
            refreshTickets();
        }
    };

    window.viewTicket = (id) => {
        const t = window.allTickets.find(x => x.id === id);
        alert(`Details:\n\n${t.description}`);
    };

    refreshTickets();
}
