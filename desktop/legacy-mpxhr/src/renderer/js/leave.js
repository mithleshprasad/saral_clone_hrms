import { exportTableToExcel } from './excel.js';
import { escapeHtml } from './utils.js';


export async function loadLeave() {
    const contentArea = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isEmployee = currentUser && currentUser.role === 'employee';

    // Context
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;

    if (!contextCompany || contextCompany === 'Loading...') {
        contentArea.innerHTML = '<div style="padding:20px;"><h3>Please select a Company.</h3></div>';
        return;
    }

    // New Layout
    contentArea.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; background:#f8fafc;">
            <!-- Header & Actions -->
            <div style="padding:15px; border-bottom:1px solid #e2e8f0; background:#fff; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2 style="margin:0; font-size:18px; color:#1e3a8a;">Leave Management</h2>
                    <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">Manage applications, approvals, and holidays</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="erp-btn" onclick="requestLeaveModal()">+ New Application</button>
                    ${!isEmployee ? `<button class="btn-secondary" onclick="manualAdjustModal()">➕ Manual Adjust</button>` : ''}
                    <button class="btn-secondary" onclick="loadHolidaysModal()">📅 Holidays</button>
                    ${!isEmployee ? `<button class="btn-secondary" onclick="loadConfigModal()">⚙️ Config</button>` : ''}
                </div>
            </div>

            <!-- Balances Row (Dynamic) -->
            <div id="leave-balances-container" style="display:flex; padding:15px; gap:15px; overflow-x:auto;">
                <!-- Balances Injected Here -->
            </div>

            <!-- Main Log -->
            <div style="flex:1; overflow:hidden; padding:0 15px 15px 15px; display:flex; flex-direction:column;">
                <div style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; flex:1; display:flex; flex-direction:column;">
                    <div style="padding:10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; font-weight:600; font-size:13px; color:#334155;">
                        Recent Applications
                    </div>
                    <div style="flex:1; overflow:auto;">
                        <table class="data-table" style="width:100%; border-collapse:collapse;">
                            <thead style="position:sticky; top:0; background:#fff; z-index:10;">
                                <tr style="background:#1e3a8a; color:white;">
                                    <th style="padding:8px;">Employee</th>
                                    <th style="padding:8px;">Type</th>
                                    <th style="padding:8px;">Dates</th>
                                    <th style="padding:8px;">Reason</th>
                                    <th style="padding:8px;">Status</th>
                                    <th style="padding:8px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="leave-list-body">
                                <tr><td colspan="6" style="text-align:center; padding:20px;">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Logic ---

    window.refreshLeaveData = async () => {
        const balContainer = document.getElementById('leave-balances-container');
        const listBody = document.getElementById('leave-list-body');

        // 1. Load Balances (For Current User mostly, or Summary for Admin?)
        // Admin likely wants to see overall pending stats, but let's stick to Employee-centric balances for now
        // Or if Admin, maybe show Quick Stats like "X Pending Requests"
        balContainer.innerHTML = '';

        if (isEmployee || currentUser.employeeId) {
            try {
                const bals = await window.electronAPI.getLeaveBalance(currentUser.employeeId);
                balContainer.innerHTML = bals.map(b => `
                    <div style="min-width:150px; background:#fff; padding:10px; border:1px solid #e2e8f0; border-radius:6px; border-left:4px solid ${b.color || '#3b82f6'}; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase;">${b.leave_type}</div>
                        <div style="font-size:20px; font-weight:bold; color:#1e293b; margin-top:2px;">${b.balance - b.used}</div>
                        <div style="font-size:10px; color:#94a3b8;">Avail / ${b.balance} Total</div>
                    </div>
                `).join('');
            } catch (e) { console.error("Bal Error", e); }
        } else {
            // Admin Stats
            balContainer.innerHTML = `<div style="padding:10px; color:#64748b; font-size:13px;">Admin View: Use 'Employee Master' for individual balances.</div>`;
        }


        // 2. Load Table
        try {
            const res = await window.electronAPI.getLeaves({
                page: 1, limit: 100,
                employeeId: isEmployee ? currentUser.employeeId : null,
                companyId: contextCompany
            });
            const rows = res.data;

            if (rows.length === 0) {
                listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No leave records found.</td></tr>';
            } else {
                listBody.innerHTML = rows.map(r => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:8px; font-weight:500;">${r.first_name ? escapeHtml(r.first_name) + ' ' + escapeHtml(r.last_name) : 'Self'} <br> <span style="font-size:11px; color:#94a3b8;">${escapeHtml(r.designation_title) || ''}</span></td>
                        <td style="padding:8px;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">${escapeHtml(r.leave_type)}</span></td>
                        <td style="padding:8px; font-size:13px;">${r.start_date} <span style="color:#94a3b8;">to</span> ${r.end_date}</td>
                        <td style="padding:8px; font-size:13px; color:#475569; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.reason)}</td>
                        <td style="padding:8px;">${getStatusBadge(r.status)}</td>
                        <td style="padding:8px;">
                            ${(r.status === 'Pending' && !isEmployee) ? `
                                <button class="erp-btn" style="padding:2px 8px; font-size:11px;" onclick="updateLeaveStatus(${r.id}, 'Approved')">Approve</button>
                                <button class="btn-secondary" style="padding:2px 8px; font-size:11px; color:#ef4444; border-color:#fca5a5;" onclick="updateLeaveStatus(${r.id}, 'Rejected')">Reject</button>
                            ` : (r.status === 'Pending' && isEmployee) ? `
                                <button class="btn-secondary" style="padding:2px 8px; font-size:11px; color:#ef4444;" onclick="window.electronAPI.deleteLeave(${r.id}).then(refreshLeaveData)">Cancel</button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            listBody.innerHTML = `<tr><td colspan="6" style="color:red; padding:10px;">Error: ${e.message}</td></tr>`;
        }
    };

    window.updateLeaveStatus = async (id, status) => {
        if (!confirm(`Mark request as ${status}?`)) return;
        await window.electronAPI.updateLeaveStatus({ id, status });
        refreshLeaveData();
    };

    // --- Modals ---

    window.requestLeaveModal = async () => {
        // Fetch Types & Employees
        // FIX: Pass contextCompany
        const types = await window.electronAPI.getLeaveTypes(contextCompany);
        let employees = [];
        if (!isEmployee) {
            const res = await window.electronAPI.getEmployees({ companyId: contextCompany, limit: 1000 });
            employees = res.employees.filter(e => e.status === 'Active');
        }

        const overlay = document.createElement('div');
        overlay.className = 'erp-modal-overlay active';
        overlay.innerHTML = `
            <div class="erp-modal-window" style="width:400px; height:auto;">
                <div class="erp-modal-header"><span>New Leave Application</span><span class="erp-modal-close">X</span></div>
                <div class="erp-modal-body">
                    <form id="leave-form" style="display:flex; flex-direction:column; gap:10px;">
                        ${!isEmployee ? `
                        <div class="form-group">
                            <label>Employee</label>
                            <select name="employee_id" class="form-control" required>
                                <option value="">Select Employee</option>
                                ${employees.map(e => `<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</option>`).join('')}
                            </select>
                        </div>` : ''}
                        
                        <div class="form-group">
                            <label>Leave Type</label>
                            <select name="leave_type" class="form-control" required>
                                ${types.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <div class="form-group" style="flex:1;">
                                <label>From</label>
                                <input type="date" name="start_date" class="form-control" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>To</label>
                                <input type="date" name="end_date" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Reason</label>
                            <textarea name="reason" class="form-control" rows="3" required></textarea>
                        </div>
                        <button type="submit" class="erp-btn" style="margin-top:10px;">Submit Application</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.erp-modal-close').onclick = () => overlay.remove();
        overlay.querySelector('#leave-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            if (isEmployee) data.employee_id = currentUser.employeeId;
            data.status = 'Pending';

            try {
                await window.electronAPI.requestLeave(data);
                overlay.remove();
                refreshLeaveData();
                alert("Application Submitted Application!");
            } catch (err) {
                alert("Error: " + err.message);
            }
        };
    };

    window.loadHolidaysModal = async () => {
        // FIX: Pass contextCompany
        const rows = await window.electronAPI.getHolidays(contextCompany);
        const html = `
             <div class="erp-modal-overlay active">
                 <div class="erp-modal-window" style="width:500px;">
                     <div class="erp-modal-header"><span>Holiday Calendar</span><span class="erp-modal-close" onclick="this.closest('.erp-modal-overlay').remove()">X</span></div>
                     <div class="erp-modal-body">
                         ${!isEmployee ? `
                         <form id="hol-form" style="display:flex; gap:5px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                             <input type="date" name="date" class="form-control" required>
                             <input type="text" name="name" class="form-control" placeholder="Holiday Name" required>
                             <select name="type" class="form-control" style="max-width:130px;">
                                 <option value="Public">Public</option>
                                 <option value="National">National</option>
                                 <option value="Restricted">Restricted (RH)</option>
                             </select>
                             <button class="erp-btn">+</button>
                         </form>` : ''}
                         <table class="data-table" style="width:100%;">
                             <thead><tr style="background:#f1f5f9;"><th>Date</th><th>Name</th><th>Type</th>${!isEmployee ? '<th>X</th>' : ''}</tr></thead>
                             <tbody>
                                 ${rows.map(h => `<tr><td>${h.date}</td><td>${escapeHtml(h.name)}</td><td>${h.type === 'Restricted' ? '<span class="status-badge pending">RH</span>' : escapeHtml(h.type || 'Public')}</td>${!isEmployee ? `<td><a style="color:red; cursor:pointer;" onclick="deleteHoliday(${h.id}, this)">X</a></td>` : ''}</tr>`).join('')}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
         `;
        document.body.insertAdjacentHTML('beforeend', html);

        if (!isEmployee) {
            const form = document.querySelector('#hol-form');
            if (form) form.onsubmit = async (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                d.companyId = contextCompany; // FIX: Add Company ID
                await window.electronAPI.addHoliday(d);
                document.querySelector('.erp-modal-overlay').remove();
                loadHolidaysModal();
            }
        }
    };

    window.deleteHoliday = async (id, el) => {
        if (confirm('Delete?')) {
            await window.electronAPI.deleteHoliday(id);
            el.closest('tr').remove();
        }
    };

    // Implemented Config Modal
    window.loadConfigModal = async () => {
        const types = await window.electronAPI.getLeaveTypes(contextCompany);

        const html = `
             <div class="erp-modal-overlay active">
                 <div class="erp-modal-window" style="width:500px;">
                     <div class="erp-modal-header"><span>Leave Configuration</span><span class="erp-modal-close" onclick="this.closest('.erp-modal-overlay').remove()">X</span></div>
                     <div class="erp-modal-body">
                         <form id="type-form" style="display:flex; gap:5px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                             <input type="text" name="name" class="form-control" placeholder="Type Name" required style="flex:2;">
                             <input type="number" name="max_days" class="form-control" placeholder="Days" required style="width:60px;">
                             <input type="color" name="color" value="#3b82f6" style="height:32px; width:40px; padding:0; border:none;">
                             <button class="erp-btn">Add</button>
                         </form>
                         <table class="data-table" style="width:100%;">
                             <thead><tr style="background:#f1f5f9;"><th>Name</th><th>Days</th><th>Color</th><th>X</th></tr></thead>
                             <tbody>
                                 ${types.map(t => `
                                     <tr>
                                         <td>${escapeHtml(t.name)}</td>
                                         <td>${t.max_days}</td>
                                         <td><div style="width:16px;height:16px;border-radius:50%;background:${t.color};"></div></td>
                                         <td><a style="color:red; cursor:pointer;" onclick="deleteLeaveType(${t.id}, this)">X</a></td>
                                     </tr>`).join('')}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const form = document.querySelector('#type-form');
        if (form) form.onsubmit = async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target));
            d.companyId = contextCompany;
            await window.electronAPI.addLeaveType(d);
            document.querySelector('.erp-modal-overlay').remove();
            loadConfigModal();
        };
    };

    window.deleteLeaveType = async (id, el) => {
        if (confirm("Delete this leave type?")) {
            await window.electronAPI.deleteLeaveType(id);
            el.closest('tr').remove();
        }
    };

    window.manualAdjustModal = async () => {
        const res = await window.electronAPI.getEmployees({ companyId: contextCompany, limit: 1000 });
        const employees = res.employees.filter(e => e.status === 'Active');
        const types = await window.electronAPI.getLeaveTypes(contextCompany);

        const overlay = document.createElement('div');
        overlay.className = 'erp-modal-overlay active';
        overlay.innerHTML = `
            <div class="erp-modal-window" style="width:400px; height:auto;">
                <div class="erp-modal-header"><span>Manual Leave Adjustment</span><span class="erp-modal-close">X</span></div>
                <div class="erp-modal-body">
                    <form id="adj-form" style="display:flex; flex-direction:column; gap:12px;">
                        <div class="form-group">
                            <label>Employee</label>
                            <select name="employeeId" class="form-control" required>
                                <option value="">Select Employee</option>
                                ${employees.map(e => `<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} (${escapeHtml(e.employee_code)})</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Leave Type</label>
                            <select name="leaveType" class="form-control" required>
                                ${types.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Adjustment Amount</label>
                            <input type="number" step="0.5" name="amount" class="form-control" placeholder="e.g. 5 or -2" required>
                            <small style="color:#64748b;">Positive to add, negative to subtract.</small>
                        </div>
                        <div class="form-group">
                            <label>Year</label>
                            <input type="number" name="year" class="form-control" value="${new Date().getFullYear()}" required>
                        </div>
                        <button type="submit" class="erp-btn" style="margin-top:10px;">Apply Adjustment</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.erp-modal-close').onclick = () => overlay.remove();
        overlay.querySelector('#adj-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                const res = await window.electronAPI.invoke('manual-leave-adjustment', data);
                if (res.success) {
                    alert("Balance adjusted successfully!");
                    overlay.remove();
                    refreshLeaveData();
                }
            } catch (err) {
                alert("Error: " + err.message);
            }
        };
    };

    // Init
    refreshLeaveData();
}

function getStatusBadge(status) {
    let color = 'gray';
    if (status === 'Approved') color = 'green';
    if (status === 'Rejected') color = 'red';
    if (status === 'Pending') color = 'orange';
    return `<span style="color:${color}; font-weight:bold; border:1px solid ${color}; padding:1px 6px; border-radius:10px; font-size:10px; text-transform:uppercase;">${status}</span>`;
}
