import { escapeHtml } from './utils.js';

export async function loadUserDeductions() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
            <div class="erp-toolbar">
                <button class="erp-btn erp-btn-primary" onclick="openUdModal('new')"><i class="fas fa-plus"></i> New</button>
                <button class="erp-btn" onclick="openUdModal('edit')"><i class="fas fa-edit"></i> Edit</button>
                <button class="erp-btn" onclick="deleteUd()"><i class="fas fa-trash"></i> Delete</button>
            </div>
            <div class="erp-grid-container" style="flex:1;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:30px;"></th>
                            <th>Name</th>
                            <th style="width:100px;">Code</th>
                            <th style="width:110px;">Calc Type</th>
                            <th style="width:100px;">Amount</th>
                            <th style="width:80px; text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="ud-grid-body"></tbody>
                </table>
            </div>
        </div>

        <div id="ud-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width:420px;">
                <div class="erp-modal-header">
                    <span id="ud-modal-title">New Deduction</span>
                    <span class="erp-modal-close" onclick="closeUdModal()">&times;</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="ud-id">
                    <div class="form-row"><label class="form-label">Name *</label><input type="text" id="ud-name" class="form-input"></div>
                    <div class="form-row"><label class="form-label">Code</label><input type="text" id="ud-code" class="form-input"></div>
                    <div class="form-row"><label class="form-label">Calc Type</label>
                        <select id="ud-calc" class="form-input">
                            <option value="Fixed">Fixed Amount</option>
                            <option value="Percentage">% of Gross Salary</option>
                        </select>
                    </div>
                    <div class="form-row"><label class="form-label">Amount / %</label><input type="number" id="ud-amount" class="form-input" step="0.01"></div>
                    <div class="form-row"><label class="form-label">Active</label><input type="checkbox" id="ud-active" checked></div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeUdModal()">Cancel</button>
                    <button class="btn-blue" onclick="saveUd()">Save</button>
                </div>
            </div>
        </div>
    `;

    let selectedId = null;
    await refresh();

    async function refresh() {
        const rows = await window.electronAPI.getUserDeductions();
        const tbody = document.getElementById('ud-grid-body');
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">No custom deductions defined yet.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(d => `
            <tr class="gw-row ${selectedId === d.id ? 'selected' : ''}" onclick="selectUdRow(${d.id})">
                <td><input type="radio" name="ud_select" ${selectedId === d.id ? 'checked' : ''} onclick="event.stopPropagation(); selectUdRow(${d.id})"></td>
                <td>${escapeHtml(d.name)}</td>
                <td>${escapeHtml(d.code) || '-'}</td>
                <td>${d.calc_type === 'Percentage' ? '% of Gross' : 'Fixed'}</td>
                <td>${d.calc_type === 'Percentage' ? d.amount + '%' : '₹' + d.amount}</td>
                <td style="text-align:center;"><span class="status-badge ${d.is_active ? 'active' : 'inactive'}">${d.is_active ? 'Active' : 'Inactive'}</span></td>
            </tr>
        `).join('');
    }

    window.selectUdRow = (id) => { selectedId = id; refresh(); };

    window.openUdModal = async (mode) => {
        if (mode === 'edit' && !selectedId) { window.showToast('Select a deduction first', 'info'); return; }
        document.getElementById('ud-modal').classList.add('active');
        document.getElementById('ud-modal-title').textContent = mode === 'edit' ? 'Edit Deduction' : 'New Deduction';
        if (mode === 'new') {
            document.getElementById('ud-id').value = '';
            document.getElementById('ud-name').value = '';
            document.getElementById('ud-code').value = '';
            document.getElementById('ud-calc').value = 'Fixed';
            document.getElementById('ud-amount').value = '';
            document.getElementById('ud-active').checked = true;
        } else {
            const rows = await window.electronAPI.getUserDeductions();
            const d = rows.find(x => x.id === selectedId);
            if (!d) return;
            document.getElementById('ud-id').value = d.id;
            document.getElementById('ud-name').value = d.name;
            document.getElementById('ud-code').value = d.code || '';
            document.getElementById('ud-calc').value = d.calc_type;
            document.getElementById('ud-amount').value = d.amount;
            document.getElementById('ud-active').checked = !!d.is_active;
        }
    };

    window.closeUdModal = () => document.getElementById('ud-modal').classList.remove('active');

    window.saveUd = async () => {
        const id = document.getElementById('ud-id').value;
        const name = document.getElementById('ud-name').value.trim();
        const code = document.getElementById('ud-code').value.trim();
        const calc_type = document.getElementById('ud-calc').value;
        const amount = parseFloat(document.getElementById('ud-amount').value) || 0;
        const is_active = document.getElementById('ud-active').checked;
        if (!name) { window.showToast('Name is required', 'warning'); return; }
        try {
            if (id) await window.electronAPI.updateUserDeduction({ id, name, code, calc_type, amount, is_active });
            else await window.electronAPI.addUserDeduction({ name, code, calc_type, amount, is_active });
            window.closeUdModal();
            await refresh();
            window.showToast('Deduction saved', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };

    window.deleteUd = async () => {
        if (!selectedId) { window.showToast('Select a deduction first', 'info'); return; }
        const ok = window.confirmDialog ? await window.confirmDialog('Delete this deduction type?', { danger: true }) : confirm('Delete this deduction type?');
        if (!ok) return;
        try {
            await window.electronAPI.deleteUserDeduction(selectedId);
            selectedId = null;
            await refresh();
            window.showToast('Deduction deleted', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };
}
