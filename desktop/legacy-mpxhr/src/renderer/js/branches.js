import { escapeHtml, escapeJsAttr } from './utils.js';

let isBulkEdit = false;

export function loadBranches() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container">
            <div class="erp-toolbar">
                <button class="erp-btn" onclick="openBranchModal('new')"><i class="fas fa-plus"></i> Add Branch</button>
                <button class="erp-btn" id="btn-branch-bulk" onclick="toggleBranchBulk()"><i class="fas fa-table"></i> Simultaneous Edit</button>
                <button class="erp-btn" id="btn-branch-save" onclick="saveBranchBulk()" style="display:none; margin-left:10px;"><i class="fas fa-save"></i> Save</button>
                <div style="flex:1"></div>
            </div>
            <div class="erp-grid-container">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:50px">ID</th>
                            <th>Branch Name</th>
                            <th>Company</th>
                            <th>Address</th>
                            <th style="width:80px">Action</th>
                        </tr>
                    </thead>
                    <tbody id="branch-grid-body"></tbody>
                </table>
            </div>
        </div>

        <!-- Modal -->
        <div id="branch-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width:500px; height:auto;">
                <div class="erp-modal-header">
                    <span>Manage Branch</span>
                    <span class="erp-modal-close" onclick="closeBranchModal()">X</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="branch-id">
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Company</label>
                        <select id="branch-company" class="form-input"></select>
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Name *</label>
                        <input type="text" id="branch-name" class="form-input">
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Address</label>
                        <textarea id="branch-address" class="form-input" style="height:60px;"></textarea>
                    </div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-blue" onclick="saveBranch()">Save</button>
                    <button class="btn-gray" onclick="closeBranchModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Reset state on load
    isBulkEdit = false;
    loadBranchGrid();
    loadBranchDropdowns();

    window.openBranchModal = (mode, id, companyId, name, address) => {
        document.getElementById('branch-modal').classList.add('active');
        if (mode === 'new') {
            document.getElementById('branch-id').value = '';
            document.getElementById('branch-name').value = '';
            document.getElementById('branch-address').value = '';
        } else {
            document.getElementById('branch-id').value = id;
            document.getElementById('branch-company').value = companyId;
            document.getElementById('branch-name').value = name;
            document.getElementById('branch-address').value = address;
        }
    };
    window.closeBranchModal = () => document.getElementById('branch-modal').classList.remove('active');
}

let allCompanies = [];

async function loadBranchGrid() {
    try {
        const list = await window.electronAPI.getBranches ? await window.electronAPI.getBranches() : [];
        const tbody = document.getElementById('branch-grid-body');

        if (isBulkEdit) {
            // Need company list for dropdown
            if (allCompanies.length === 0) allCompanies = await window.electronAPI.getCompanies();

            tbody.innerHTML = list.map(b => `
                <tr data-id="${b.id}" class="branch-bulk-row">
                    <td>${b.id}</td>
                    <td><input type="text" class="form-input bulk-bname" value="${escapeHtml(b.name)}"></td>
                    <td>
                        <select class="form-input bulk-bcomp">
                            <option value="">Select Company</option>
                            ${allCompanies.map(c => `<option value="${c.id}" ${c.id == b.company_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="text" class="form-input bulk-baddr" value="${escapeHtml(b.address)}"></td>
                    <td>-</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = list.map(b => `
                <tr>
                    <td>${b.id}</td>
                    <td>${escapeHtml(b.name)}</td>
                    <td>${escapeHtml(b.company_name) || '-'}</td>
                    <td>${escapeHtml(b.address) || '-'}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="action-btn edit" onclick="openBranchModal('edit', '${b.id}', '${b.company_id}', '${escapeJsAttr(b.name)}', '${escapeJsAttr(b.address)}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteBranch('${b.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function loadBranchDropdowns() {
    try {
        const companies = await window.electronAPI.getCompanies();
        allCompanies = companies; // cache logic
        const sel = document.getElementById('branch-company');
        if (sel) sel.innerHTML = companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    } catch (e) { }
}

window.toggleBranchBulk = () => {
    isBulkEdit = !isBulkEdit;
    const btn = document.getElementById('btn-branch-bulk');
    if (btn) btn.innerHTML = isBulkEdit ? '<i class="fas fa-times"></i> Cancel' : '<i class="fas fa-table"></i> Simultaneous Edit';
    const saveBtn = document.getElementById('btn-branch-save');
    if (saveBtn) saveBtn.style.display = isBulkEdit ? 'inline-block' : 'none';
    if (document.getElementById('branch-grid-body')) loadBranchGrid();
};

window.saveBranchBulk = async () => {
    const rows = document.querySelectorAll('.branch-bulk-row');
    const updates = [];
    rows.forEach(r => {
        updates.push({
            id: r.dataset.id,
            name: r.querySelector('.bulk-bname').value,
            company_id: r.querySelector('.bulk-bcomp').value,
            address: r.querySelector('.bulk-baddr').value
        });
    });

    try {
        const btn = document.getElementById('btn-branch-save');
        btn.textContent = 'Saving...';
        await window.electronAPI.invoke('update-branch-bulk', updates);
        window.showToast('Branches Updated', 'success');
        isBulkEdit = false;
        document.getElementById('btn-branch-bulk').innerHTML = '<i class="fas fa-table"></i> Simultaneous Edit';
        document.getElementById('btn-branch-save').style.display = 'none';
        loadBranchGrid();
    } catch (e) {
        window.showToast('Error: ' + e.message, 'error');
    } finally {
        if (document.getElementById('btn-branch-save')) document.getElementById('btn-branch-save').innerHTML = '<i class="fas fa-save"></i> Save';
    }
};

window.saveBranch = async () => {
    const id = document.getElementById('branch-id').value;
    const data = {
        company_id: document.getElementById('branch-company').value,
        name: document.getElementById('branch-name').value,
        address: document.getElementById('branch-address').value
    };

    if (!data.name) return window.showToast('Name required', 'error');

    try {
        if (id) {
            await window.electronAPI.updateBranch({ id, ...data });
        } else {
            await window.electronAPI.addBranch(data);
        }
        window.closeBranchModal();
        loadBranchGrid();
        window.showToast('Saved', 'success');
    } catch (e) { window.showToast('Error', 'error'); }
};

window.deleteBranch = async (id) => {
    if (confirm('Delete this Branch?')) {
        try {
            await window.electronAPI.deleteBranch(id);
            loadBranchGrid();
            window.showToast('Deleted', 'success');
        } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
    }
};
