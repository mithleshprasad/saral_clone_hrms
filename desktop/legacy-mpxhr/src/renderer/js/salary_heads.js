import { escapeHtml } from './utils.js';

let loadedHeads = [];
let selectedHeadId = null;

export function loadSalaryHeads() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container">
            <div class="erp-toolbar">
                <button class="erp-btn" onclick="openHeadModal('new')"><i class="fas fa-plus"></i> Add New</button>
                <button class="erp-btn" onclick="openHeadModal('edit')"><i class="fas fa-edit"></i> Modify</button>
                <button class="erp-btn" onclick="deleteHead()"><i class="fas fa-trash"></i> Delete</button>
                <div style="flex:1"></div>
            </div>

            <div class="erp-grid-container" style="overflow:auto;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:40px">S.No</th>
                            <th>Description / Bifurcation</th>
                            <th>Short Code</th>
                            <th>Form 16 Purpose</th>
                            <th style="text-align:center">Prop.</th>
                            <th style="text-align:center">PF</th>
                            <th style="text-align:center">ESI</th>
                            <th style="text-align:center">Bonus</th>
                            <th style="text-align:center">OT</th>
                            <th style="text-align:center">Active</th>
                        </tr>
                    </thead>
                    <tbody id="heads-grid-body">
                        <!-- Loaded Dynamically -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SALARY HEAD MODAL -->
        <div id="head-modal" class="erp-modal-overlay" style="z-index: 2000;">
            <div class="erp-modal-window" style="width:600px; height:auto;">
                <div class="erp-modal-header" style="background: linear-gradient(to right, #2c3e50, #4ca1af);">
                    <span id="head-modal-title">Salary Head Setup</span>
                    <span class="erp-modal-close" onclick="closeHeadModal()">X</span>
                </div>
                
                <div class="erp-modal-body" style="padding:15px;">
                    <input type="hidden" id="head-id">
                    
                    <div class="form-row">
                        <label class="form-label" style="width:180px;">Salary Head Description *</label>
                        <input type="text" id="head-name" class="form-input" style="font-weight:bold;">
                    </div>
                    
                    <div class="form-row">
                        <label class="form-label" style="width:180px;">Short Code</label>
                        <input type="text" id="head-code" class="form-input" style="width:100px;">
                    </div>

                    <div class="form-row">
                        <label class="form-label" style="width:180px;">Form 16 Purpose</label>
                        <select id="head-f16" class="form-input">
                            <option>Salary u/s 17(1)</option>
                            <option>Allowances u/s 17(1)</option>
                            <option>Deduction u/s 16</option>
                            <option>Not Applicable</option>
                        </select>
                    </div>

                    <div style="margin-top:10px; margin-left:180px;">
                        <label style="display:block; margin-bottom:5px;"><input type="checkbox" id="head-prop"> Proportionate to Present Days</label>
                    </div>

                    <div class="erp-fieldset" style="margin-top:15px;">
                        <div class="erp-legend">Consider for Calculation of:</div>
                        <div style="display:flex; gap:20px;">
                            <label><input type="checkbox" id="head-pf"> PF</label>
                            <label><input type="checkbox" id="head-esi"> ESI</label>
                            <label><input type="checkbox" id="head-bonus"> BONUS</label>
                            <label><input type="checkbox" id="head-ot"> Over Time</label>
                        </div>
                    </div>

                    <div style="margin-top:10px;">
                        <label><input type="checkbox" id="head-active" checked> Active</label>
                    </div>

                </div>

                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeHeadModal()">Cancel</button>
                    <button class="btn-blue" onclick="saveHead()">Save</button>
                </div>
            </div>
        </div>
    `;

    loadHeadsData();

    // Attach global scope functions for HTML onclicks
    window.openHeadModal = openHeadModal;
    window.closeHeadModal = closeHeadModal;
    window.saveHead = saveHead;
    window.deleteHead = deleteHead;
    window.selectHeadRow = selectHeadRow;
}


async function loadHeadsData() {
    const companyId = window.state?.companyId;
    if (!companyId) return;

    try {
        const heads = await window.electronAPI.invoke('get-salary-heads', { companyId });
        loadedHeads = heads;
        renderGrid();
    } catch (e) {
        console.error(e);
    }
}

function renderGrid() {
    const tbody = document.getElementById('heads-grid-body');
    if (loadedHeads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center">No records found.</td></tr>';
        return;
    }
    tbody.innerHTML = loadedHeads.map((h, index) => `
        <tr onclick="selectHeadRow(this, ${h.id})" class="${selectedHeadId == h.id ? 'selected' : ''}" data-id="${h.id}">
            <td>${index + 1}</td>
            <td><input type="text" class="erp-input-grid" value="${escapeHtml(h.name)}" onchange="updateInline(${index}, 'name', this.value)" onclick="event.stopPropagation()"></td>
            <td><input type="text" class="erp-input-grid" value="${escapeHtml(h.code)}" style="width:50px" onchange="updateInline(${index}, 'code', this.value)" onclick="event.stopPropagation()"></td>
            <td>
                <select class="erp-input-grid" onchange="updateInline(${index}, 'form_16_type', this.value)" onclick="event.stopPropagation()">
                    <option ${h.form_16_type === 'Salary u/s 17(1)' ? 'selected' : ''}>Salary u/s 17(1)</option>
                    <option ${h.form_16_type === 'Allowances u/s 17(1)' ? 'selected' : ''}>Allowances u/s 17(1)</option>
                    <option ${h.form_16_type === 'Deduction u/s 16' ? 'selected' : ''}>Deduction u/s 16</option>
                    <option ${h.form_16_type === 'Not Applicable' ? 'selected' : ''}>Not Applicable</option>
                </select>
            </td>
            <td style="text-align:center"><input type="checkbox" ${h.is_proportionate ? 'checked' : ''} onchange="updateInline(${index}, 'is_proportionate', this.checked)" onclick="event.stopPropagation()"></td>
            <td style="text-align:center"><input type="checkbox" ${h.consider_for_pf ? 'checked' : ''} onchange="updateInline(${index}, 'consider_for_pf', this.checked)" onclick="event.stopPropagation()"></td>
            <td style="text-align:center"><input type="checkbox" ${h.consider_for_esi ? 'checked' : ''} onchange="updateInline(${index}, 'consider_for_esi', this.checked)" onclick="event.stopPropagation()"></td>
            <td style="text-align:center"><input type="checkbox" ${h.consider_for_bonus ? 'checked' : ''} onchange="updateInline(${index}, 'consider_for_bonus', this.checked)" onclick="event.stopPropagation()"></td>
            <td style="text-align:center"><input type="checkbox" ${h.consider_for_overtime ? 'checked' : ''} onchange="updateInline(${index}, 'consider_for_overtime', this.checked)" onclick="event.stopPropagation()"></td>
            <td style="text-align:center"><input type="checkbox" ${h.is_active ? 'checked' : ''} onchange="updateInline(${index}, 'is_active', this.checked)" onclick="event.stopPropagation()"></td>
        </tr>
    `).join('');
}

window.updateInline = async (index, field, value) => {
    const head = loadedHeads[index];
    head[field] = value;

    // Auto-save
    try {
        await window.electronAPI.invoke('upsert-salary-head', head);
        // Optional: window.showToast("Saved", "success"); // Could be too spammy
        console.log("Auto-saved head:", head.name);
    } catch (e) {
        window.showToast("Save Failed", "error");
        console.error(e);
    }
};

function selectHeadRow(tr, id) {
    document.querySelectorAll('#heads-grid-body tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
    selectedHeadId = id;
}

function openHeadModal(mode) {
    if (mode === 'edit') {
        if (!selectedHeadId) { window.showToast("Select a row first", "error"); return; }
        const h = loadedHeads.find(x => x.id === selectedHeadId);
        if (!h) return;

        document.getElementById('head-modal-title').textContent = "Modify Salary Head";
        document.getElementById('head-id').value = h.id;
        document.getElementById('head-name').value = h.name;
        document.getElementById('head-code').value = h.code || '';
        document.getElementById('head-f16').value = h.form_16_type;

        document.getElementById('head-prop').checked = !!h.is_proportionate;
        document.getElementById('head-pf').checked = !!h.consider_for_pf;
        document.getElementById('head-esi').checked = !!h.consider_for_esi;
        document.getElementById('head-bonus').checked = !!h.consider_for_bonus;
        document.getElementById('head-ot').checked = !!h.consider_for_overtime;
        document.getElementById('head-active').checked = !!h.is_active;
    } else {
        selectedHeadId = null; // Clear selection on new? Or keep it? User might want to duplicate. Assuming new.
        document.getElementById('head-modal-title').textContent = "New Salary Head";
        document.getElementById('head-id').value = "";
        document.getElementById('head-name').value = "";
        document.getElementById('head-code').value = "";
        document.getElementById('head-f16').selectedIndex = 0;

        document.getElementById('head-prop').checked = true;
        document.getElementById('head-pf').checked = true;
        document.getElementById('head-esi').checked = true;
        document.getElementById('head-bonus').checked = false;
        document.getElementById('head-ot').checked = false;
        document.getElementById('head-active').checked = true;
    }

    document.getElementById('head-modal').classList.add('active');
}

function closeHeadModal() {
    document.getElementById('head-modal').classList.remove('active');
}

async function saveHead() {
    const name = document.getElementById('head-name').value;
    if (!name) { window.showToast("Name is required", "error"); return; }

    const payload = {
        id: document.getElementById('head-id').value || null,
        company_id: window.state?.companyId,
        name: name,
        code: document.getElementById('head-code').value,
        form_16_type: document.getElementById('head-f16').value,
        is_proportionate: document.getElementById('head-prop').checked,
        consider_for_pf: document.getElementById('head-pf').checked,
        consider_for_esi: document.getElementById('head-esi').checked,
        consider_for_bonus: document.getElementById('head-bonus').checked,
        consider_for_overtime: document.getElementById('head-ot').checked,
        is_active: document.getElementById('head-active').checked
    };

    try {
        await window.electronAPI.invoke('upsert-salary-head', payload);
        window.showToast("Saved Successfully", "success");
        closeHeadModal();
        await loadHeadsData();
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
}

async function deleteHead() {
    if (!selectedHeadId) { window.showToast("Select a row to delete", "error"); return; }
    if (!confirm("Are you sure you want to delete?")) return;

    try {
        await window.electronAPI.invoke('delete-salary-head', selectedHeadId);
        window.showToast("Deleted", "success");
        selectedHeadId = null;
        await loadHeadsData();
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
}
