import { escapeHtml } from './utils.js';

export async function loadLoans() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
            <div class="erp-toolbar">
                <button class="erp-btn erp-btn-primary" onclick="openLoanModal('new')"><i class="fas fa-plus"></i> New</button>
                <button class="erp-btn" onclick="openLoanModal('edit')"><i class="fas fa-edit"></i> Edit</button>
                <button class="erp-btn" onclick="closeLoan()"><i class="fas fa-check"></i> Mark Closed</button>
                <button class="erp-btn" onclick="deleteLoan()"><i class="fas fa-trash"></i> Delete</button>
            </div>
            <div class="erp-grid-container" style="flex:1;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:30px;"></th>
                            <th>Employee</th>
                            <th style="width:110px;">Loan Type</th>
                            <th style="width:110px;">Principal</th>
                            <th style="width:100px;">Monthly EMI</th>
                            <th style="width:100px;">Balance</th>
                            <th style="width:100px;">Start Date</th>
                            <th style="width:90px; text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="loan-grid-body"></tbody>
                </table>
            </div>
        </div>

        <div id="loan-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width:460px;">
                <div class="erp-modal-header">
                    <span id="loan-modal-title">New Loan</span>
                    <span class="erp-modal-close" onclick="closeLoanModal()">&times;</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="loan-id">
                    <div class="form-row"><label class="form-label">Employee *</label><select id="loan-emp" class="form-input"></select></div>
                    <div class="form-row"><label class="form-label">Loan Type</label><input type="text" id="loan-type" class="form-input" placeholder="e.g. Personal, Advance, Vehicle"></div>
                    <div class="form-row"><label class="form-label">Principal Amount</label><input type="number" id="loan-principal" class="form-input" step="0.01"></div>
                    <div class="form-row"><label class="form-label">Monthly EMI</label><input type="number" id="loan-emi" class="form-input" step="0.01"></div>
                    <div class="form-row"><label class="form-label">Start Date</label><input type="date" id="loan-start" class="form-input"></div>
                    <div class="form-row"><label class="form-label">Balance</label><input type="number" id="loan-balance" class="form-input" step="0.01"></div>
                    <div class="form-row"><label class="form-label">Notes</label><input type="text" id="loan-notes" class="form-input"></div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeLoanModal()">Cancel</button>
                    <button class="btn-blue" onclick="saveLoan()">Save</button>
                </div>
            </div>
        </div>
    `;

    let selectedId = null;
    let allLoans = [];
    let allEmployees = [];

    try {
        const empRes = await window.electronAPI.getEmployees({ limit: 1000 });
        allEmployees = empRes.employees || empRes || [];
    } catch (e) { console.error(e); }

    await refresh();

    async function refresh() {
        allLoans = await window.electronAPI.getLoans();
        const tbody = document.getElementById('loan-grid-body');
        if (allLoans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">No loans recorded yet.</td></tr>';
            return;
        }
        tbody.innerHTML = allLoans.map(l => `
            <tr class="gw-row ${selectedId === l.id ? 'selected' : ''}" onclick="selectLoanRow(${l.id})">
                <td><input type="radio" name="loan_select" ${selectedId === l.id ? 'checked' : ''} onclick="event.stopPropagation(); selectLoanRow(${l.id})"></td>
                <td>${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</td>
                <td>${escapeHtml(l.loan_type)}</td>
                <td>₹${Number(l.principal_amount || 0).toLocaleString()}</td>
                <td>₹${Number(l.monthly_emi || 0).toLocaleString()}</td>
                <td>₹${Number(l.balance || 0).toLocaleString()}</td>
                <td>${l.start_date || '-'}</td>
                <td style="text-align:center;"><span class="status-badge ${l.status === 'Active' ? 'active' : 'inactive'}">${escapeHtml(l.status)}</span></td>
            </tr>
        `).join('');
    }

    window.selectLoanRow = (id) => { selectedId = id; refresh(); };

    function populateEmpSelect() {
        const sel = document.getElementById('loan-emp');
        sel.innerHTML = allEmployees.map(e => `<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} (${escapeHtml(e.employee_code) || e.id})</option>`).join('');
    }

    window.openLoanModal = (mode) => {
        if (mode === 'edit' && !selectedId) { window.showToast('Select a loan first', 'info'); return; }
        populateEmpSelect();
        document.getElementById('loan-modal').classList.add('active');
        document.getElementById('loan-modal-title').textContent = mode === 'edit' ? 'Edit Loan' : 'New Loan';
        if (mode === 'new') {
            document.getElementById('loan-id').value = '';
            document.getElementById('loan-type').value = 'General';
            document.getElementById('loan-principal').value = '';
            document.getElementById('loan-emi').value = '';
            document.getElementById('loan-start').value = new Date().toISOString().split('T')[0];
            document.getElementById('loan-balance').value = '';
            document.getElementById('loan-notes').value = '';
        } else {
            const l = allLoans.find(x => x.id === selectedId);
            if (!l) return;
            document.getElementById('loan-id').value = l.id;
            document.getElementById('loan-emp').value = l.employee_id;
            document.getElementById('loan-type').value = l.loan_type;
            document.getElementById('loan-principal').value = l.principal_amount;
            document.getElementById('loan-emi').value = l.monthly_emi;
            document.getElementById('loan-start').value = l.start_date || '';
            document.getElementById('loan-balance').value = l.balance;
            document.getElementById('loan-notes').value = l.notes || '';
        }
    };

    window.closeLoanModal = () => document.getElementById('loan-modal').classList.remove('active');

    window.saveLoan = async () => {
        const id = document.getElementById('loan-id').value;
        const employee_id = document.getElementById('loan-emp').value;
        const loan_type = document.getElementById('loan-type').value.trim() || 'General';
        const principal_amount = parseFloat(document.getElementById('loan-principal').value) || 0;
        const monthly_emi = parseFloat(document.getElementById('loan-emi').value) || 0;
        const start_date = document.getElementById('loan-start').value;
        const notes = document.getElementById('loan-notes').value.trim();
        if (!employee_id) { window.showToast('Select an employee', 'warning'); return; }
        try {
            if (id) {
                const balance = parseFloat(document.getElementById('loan-balance').value) || 0;
                const status = balance <= 0 ? 'Closed' : 'Active';
                await window.electronAPI.updateLoan({ id, loan_type, principal_amount, monthly_emi, start_date, balance, status, notes });
            } else {
                await window.electronAPI.addLoan({ employee_id, loan_type, principal_amount, monthly_emi, start_date, notes });
            }
            window.closeLoanModal();
            await refresh();
            window.showToast('Loan saved', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };

    window.closeLoan = async () => {
        if (!selectedId) { window.showToast('Select a loan first', 'info'); return; }
        const l = allLoans.find(x => x.id === selectedId);
        if (!l) return;
        try {
            await window.electronAPI.updateLoan({ ...l, balance: 0, status: 'Closed' });
            await refresh();
            window.showToast('Loan marked as closed', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };

    window.deleteLoan = async () => {
        if (!selectedId) { window.showToast('Select a loan first', 'info'); return; }
        const ok = window.confirmDialog ? await window.confirmDialog('Delete this loan record?', { danger: true }) : confirm('Delete this loan record?');
        if (!ok) return;
        try {
            await window.electronAPI.deleteLoan(selectedId);
            selectedId = null;
            await refresh();
            window.showToast('Loan deleted', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };
}
