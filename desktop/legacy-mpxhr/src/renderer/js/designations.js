
import { escapeHtml, escapeJsAttr } from './utils.js';

let isBulkEdit = false;

export function loadDesignations() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container">
            <div class="erp-toolbar">
                <button class="erp-btn" onclick="openDesigModal('new')"><i class="fas fa-plus"></i> Add Designation</button>
                <button class="erp-btn" id="btn-desig-bulk" onclick="toggleDesigBulk()"><i class="fas fa-table"></i> Simultaneous Edit</button>
                <button class="erp-btn" id="btn-desig-save" onclick="saveDesigBulk()" style="display:none; margin-left:10px;"><i class="fas fa-save"></i> Save</button>
                <div style="flex:1"></div>
            </div>
            <div class="erp-grid-container">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:50px">ID</th>
                            <th>Designation Title</th>
                            <th>Base Salary (Default)</th>
                            <th style="width:80px">Action</th>
                        </tr>
                    </thead>
                    <tbody id="desig-grid-body"></tbody>
                </table>
            </div>
        </div>

        <!-- Modal -->
        <div id="desig-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width:400px; height:auto;">
                <div class="erp-modal-header">
                    <span>Manage Designation</span>
                    <span class="erp-modal-close" onclick="closeDesigModal()">X</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="desig-id">
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Title *</label>
                        <input type="text" id="desig-title" class="form-input">
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Base Salary</label>
                        <input type="number" id="desig-salary" class="form-input" value="0">
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">LWF Category</label>
                        <select id="desig-lwf" class="form-input">
                            <option value="">-- None --</option>
                            <option value="Employee">Employee</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Manager/Officer">Manager / Officer</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Probation (days)</label>
                        <input type="number" id="desig-probation" class="form-input" value="90">
                    </div>
                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Deduct PT</label>
                        <input type="checkbox" id="desig-deduct-pt" checked>
                    </div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-blue" onclick="saveDesignation()">Save</button>
                    <button class="btn-gray" onclick="closeDesigModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    isBulkEdit = false;
    loadDesigGrid();

    window.openDesigModal = async (mode, id) => {
        document.getElementById('desig-modal').classList.add('active');
        if (mode === 'new') {
            document.getElementById('desig-id').value = '';
            document.getElementById('desig-title').value = '';
            document.getElementById('desig-salary').value = '0';
            document.getElementById('desig-lwf').value = '';
            document.getElementById('desig-probation').value = '90';
            document.getElementById('desig-deduct-pt').checked = true;
        } else {
            const list = await window.electronAPI.getPositions();
            const d = list.find(x => String(x.id) === String(id));
            if (!d) return;
            document.getElementById('desig-id').value = d.id;
            document.getElementById('desig-title').value = d.title;
            document.getElementById('desig-salary').value = d.base_salary || 0;
            document.getElementById('desig-lwf').value = d.lwf_category || '';
            document.getElementById('desig-probation').value = d.probation_period_days || 90;
            document.getElementById('desig-deduct-pt').checked = d.deduct_pt !== 0;
        }
    };
    window.closeDesigModal = () => document.getElementById('desig-modal').classList.remove('active');
}

async function loadDesigGrid() {
    try {
        const list = await window.electronAPI.getPositions ? await window.electronAPI.getPositions() : [];
        const tbody = document.getElementById('desig-grid-body');

        if (isBulkEdit) {
            tbody.innerHTML = list.map(d => `
                <tr data-id="${d.id}" class="desig-bulk-row">
                    <td>${d.id}</td>
                    <td><input type="text" class="form-input bulk-dtitle" value="${escapeHtml(d.title)}"></td>
                    <td><input type="number" class="form-input bulk-dsal" value="${d.base_salary || 0}"></td>
                    <td>-</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = list.map(d => `
                <tr>
                    <td>${d.id}</td>
                    <td>${escapeHtml(d.title)}</td>
                    <td>${d.base_salary || 0}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="action-btn edit" onclick="openDesigModal('edit', '${d.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteDesignation('${d.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

window.toggleDesigBulk = () => {
    isBulkEdit = !isBulkEdit;
    const btn = document.getElementById('btn-desig-bulk');
    if (btn) btn.innerHTML = isBulkEdit ? '<i class="fas fa-times"></i> Cancel' : '<i class="fas fa-table"></i> Simultaneous Edit';
    const saveBtn = document.getElementById('btn-desig-save');
    if (saveBtn) saveBtn.style.display = isBulkEdit ? 'inline-block' : 'none';
    if (document.getElementById('desig-grid-body')) loadDesigGrid();
};

window.saveDesigBulk = async () => {
    const rows = document.querySelectorAll('.desig-bulk-row');
    const updates = [];
    rows.forEach(r => {
        updates.push({
            id: r.dataset.id,
            title: r.querySelector('.bulk-dtitle').value,
            base_salary: r.querySelector('.bulk-dsal').value
        });
    });

    try {
        const btn = document.getElementById('btn-desig-save');
        btn.textContent = 'Saving...';
        await window.electronAPI.invoke('update-position-bulk', updates);
        window.showToast('Designations Updated', 'success');

        isBulkEdit = false;
        document.getElementById('btn-desig-bulk').innerHTML = '<i class="fas fa-table"></i> Simultaneous Edit';
        document.getElementById('btn-desig-save').style.display = 'none';
        loadDesigGrid();
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
    finally {
        if (document.getElementById('btn-desig-save')) document.getElementById('btn-desig-save').innerHTML = '<i class="fas fa-save"></i> Save';
    }
};

window.saveDesignation = async () => {
    const id = document.getElementById('desig-id').value;
    const data = {
        title: document.getElementById('desig-title').value,
        base_salary: document.getElementById('desig-salary').value,
        lwf_category: document.getElementById('desig-lwf').value,
        probation_period_days: document.getElementById('desig-probation').value,
        deduct_pt: document.getElementById('desig-deduct-pt').checked
    };

    if (!data.title) return window.showToast('Title required', 'error');

    try {
        if (id) {
            await window.electronAPI.updatePosition({ id, ...data });
        } else {
            await window.electronAPI.addPosition(data);
        }
        window.closeDesigModal();
        loadDesigGrid();
        window.showToast('Saved', 'success');
    } catch (e) { window.showToast('Error', 'error'); }
};

window.deleteDesignation = async (id) => {
    if (confirm('Delete this Designation?')) {
        try {
            await window.electronAPI.deletePosition(id);
            loadDesigGrid();
            window.showToast('Deleted', 'success');
        } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
    }
};
