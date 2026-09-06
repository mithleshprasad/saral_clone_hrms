import { escapeHtml } from './utils.js';

export function loadDepartments() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container">
            <div class="erp-toolbar">
                <button class="erp-btn" onclick="addDepartment()"><i class="fas fa-plus"></i> Add</button>
                <button class="erp-btn" onclick="deleteDepartment()"><i class="fas fa-trash"></i> Delete</button>
                <div style="flex:1"></div>
            </div>

            <div class="erp-grid-container">
                 <table class="erp-table" id="dept-table">
                     <thead>
                         <tr>
                             <th style="width:30px"><input type="checkbox"></th>
                             <th style="width:60px">ID</th>
                             <th>Department Name</th>
                             <th>Parent Department</th>
                             <th style="width:80px">Status</th>
                         </tr>
                     </thead>
                     <tbody id="dept-grid-body">
                         <!-- Loaded details -->
                     </tbody>
                 </table>
            </div>
        </div>

        <!-- Inline Add Modal (Simulated as ERP Dialog) -->
        <div id="erp-dialog" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:300px; background:var(--erp-bg); border:2px solid #555; box-shadow:0 3px 6px rgba(0,0,0,0.3); z-index:2000;">
            <div style="background:var(--erp-header-bg); padding:5px; font-weight:bold; color:black; display:flex; justify-content:space-between;">
                <span>New Department</span>
                <span style="cursor:pointer" onclick="closeErpDialog()">x</span>
            </div>
            <div style="padding:15px; display:flex; flex-direction:column; gap:10px;">
                <div class="erp-form-row" style="display:block;">
                    <label style="display:block; margin-bottom:3px;">Department Name:</label>
                    <input type="text" id="new-dept-name" class="erp-input" style="width:100%">
                </div>
                <div style="text-align:right; margin-top:10px;">
                    <button class="erp-btn" onclick="saveNewDepartment()">Save</button>
                </div>
            </div>
        </div>
    `;

    loadDepartmentData();

    // Global Window Functions for this module
    window.addDepartment = () => document.getElementById('erp-dialog').style.display = 'block';
    window.closeErpDialog = () => document.getElementById('erp-dialog').style.display = 'none';
}

async function loadDepartmentData() {
    const tbody = document.getElementById('dept-grid-body');
    if (!tbody) return;

    try {
        const departments = await window.electronAPI.getDepartments();
        tbody.innerHTML = departments.map(d => `
            <tr>
                <td><input type="checkbox" value="${d.id}"></td>
                <td>${d.id}</td>
                <td><input type="text" class="erp-input" value="${escapeHtml(d.name)}" style="border:none; background:transparent;" onchange="updateDepartment(${d.id}, this.value)"></td>
                <td>-</td>
                <td>Active</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red">Error loading data</td></tr>';
    }
}

window.saveNewDepartment = async () => {
    const name = document.getElementById('new-dept-name').value;
    if (name) {
        try {
            await window.electronAPI.addDepartment({ name });
            window.closeErpDialog();
            loadDepartmentData();
            window.showToast('Department Added');
        } catch (err) { window.showToast('Error', 'error'); }
    }
};

window.updateDepartment = async (id, name) => {
    // Implement update logic if API supports it
    // await window.electronAPI.updateDepartment(id, {name});
    console.log("Updating dept", id, name);
};

window.deleteDepartment = async () => {
    // Collect Checked IDs
    const checked = Array.from(document.querySelectorAll('#dept-grid-body input[type="checkbox"]:checked')).map(cb => cb.value);
    if (checked.length > 0) {
        if (confirm(`Delete ${checked.length} departments?`)) {
            for (const id of checked) {
                await window.electronAPI.deleteDepartment(id);
            }
            loadDepartmentData();
        }
    }
};
