import { escapeHtml } from './utils.js';

let currentCompId = null;
let isBulkEdit = false;

export function loadCompanies() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
            <!-- Main Grid Toolbar -->
            <div class="erp-toolbar" style="flex-shrink: 0; padding: 8px; background: #f1f3f4; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 5px;">
                <button class="erp-btn" onclick="openCompanyModal('new')"><i class="fas fa-plus"></i> New</button>
                <button class="erp-btn" onclick="openCompanyModal('edit')"><i class="fas fa-edit"></i> Edit</button>
                <button class="erp-btn" onclick="deleteCompany()"><i class="fas fa-trash"></i> Delete</button>
                
                <div style="width:1px; height:20px; background:#ccc; margin:0 5px;"></div>
                
                <button class="erp-btn" id="btn-bulk-edit-comp" onclick="toggleBulkEditComp()"><i class="fas fa-table"></i> Simultaneous Edit</button>
                <button class="erp-btn" id="btn-bulk-save-comp" onclick="saveBulkEditComp()" style="display:none;"><i class="fas fa-save"></i> Save</button>
                
                <div style="flex:1"></div>
            </div>

            <!-- Company Grid -->
            <div class="erp-grid-container" id="comp-grid-container" style="flex: 1; overflow: auto; background: white;">
                <table class="erp-table" style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                        <tr style="background: #e9ecef; border-bottom: 2px solid #dee2e6;">
                            <th style="width:30px; padding: 8px;"><input type="checkbox" id="comp-select-all" title="Select All" onclick="toggleSelectAllComp(this)"></th>
                            <th style="width:50px; padding: 8px;">ID</th>
                            <th style="padding: 8px;">NAME</th>
                            <th style="padding: 8px;">Code</th>
                            <th style="padding: 8px;">ADDRESS</th>
                            <th style="padding: 8px;">PHONE</th>
                            <th style="width:80px; padding: 8px;">STATUS</th>
                        </tr>
                    </thead>
                    <tbody id="comp-grid-body">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- THE MODAL -->
        <div id="company-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width: 800px;">
                <div class="erp-modal-header">
                    <span id="company-modal-title">NEW COMPANY ENTRY</span>
                    <span class="erp-modal-close" onclick="closeCompanyModal()">X</span>
                </div>
                
                <div class="erp-modal-body">
                    <div class="modal-tabs">
                        <div class="modal-tab active" onclick="switchCompTab('gen', this)">General</div>
                        <div class="modal-tab" onclick="switchCompTab('stat', this)">Statutory</div>
                        <div class="modal-tab" onclick="switchCompTab('pf', this)">PF / ESI</div>
                        <div class="modal-tab" onclick="switchCompTab('bank', this)">Bank</div>
                        <div class="modal-tab" onclick="switchCompTab('mgmt', this)">Management</div>
                    </div>

                    <!-- General Tab -->
                    <div id="tab-gen" class="comp-tab-content" style="display:block;">
                        <input type="hidden" id="comp-id">
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1;">
                                <div class="form-row"><label class="form-label">Name *</label><input type="text" id="comp-name" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Code</label><input type="text" id="comp-code" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Est. Date</label><input type="date" id="comp-est" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Biz Type</label><input type="text" id="comp-biz" class="form-input"></div>
                            </div>
                            <div style="flex:1;">
                                <div class="form-row"><label class="form-label">Phone</label><input type="text" id="comp-phone" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Phone 2</label><input type="text" id="comp-phone2" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Email</label><input type="text" id="comp-email" class="form-input"></div>
                                <div class="form-row"><label class="form-label">Website</label><input type="text" id="comp-web" class="form-input"></div>
                            </div>
                        </div>
                        <div class="erp-fieldset" style="margin-top:10px;">
                            <div class="erp-legend">Address</div>
                            <textarea id="comp-addr" class="form-input" style="height:40px; margin-bottom:5px;" placeholder="Address Line 1"></textarea>
                            <input type="text" id="comp-addr2" class="form-input" style="margin-bottom:5px;" placeholder="Address Line 2">
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="comp-city" class="form-input" placeholder="City">
                                <input type="text" id="comp-state" class="form-input" placeholder="State">
                                <input type="text" id="comp-pin" class="form-input" placeholder="PIN" style="width:80px;">
                            </div>
                        </div>

                        <div class="erp-fieldset" style="margin-top:10px;">
                            <div class="erp-legend">Company Logo</div>
                            <div style="display:flex; align-items:center; gap:20px;">
                                <div id="comp-logo-preview-container" style="width:80px; height:80px; border:1px solid #ddd; display:flex; align-items:center; justify-content:center; background:#f8f9fa; border-radius:4px; overflow:hidden;">
                                    <span id="logo-placeholder" style="font-size:10px; color:#999;">No Logo</span>
                                    <img id="comp-logo-preview" style="display:none; width:100%; height:100%; object-fit:contain;">
                                </div>
                                <div>
                                    <input type="file" id="comp-logo-input" accept="image/*" style="display:none;" onchange="handleLogoUpload(this)">
                                    <button class="btn-secondary btn-sm" onclick="document.getElementById('comp-logo-input').click()"><i class="fas fa-upload"></i> Choose Logo</button>
                                    <button class="btn-gray btn-sm" onclick="removeLogo()" style="margin-left:5px;"><i class="fas fa-trash"></i> Remove</button>
                                    <div style="font-size:10px; color:#666; margin-top:5px;">Max size 500KB. PNG/JPG preferred.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statutory Tab -->
                    <div id="tab-stat" class="comp-tab-content" style="display:none;">
                         <div class="form-row"><label class="form-label">PAN No</label><input type="text" id="comp-pan" class="form-input"></div>
                         <div class="form-row"><label class="form-label">TAN No</label><input type="text" id="comp-tan" class="form-input"></div>
                         <div class="form-row"><label class="form-label">GSTIN</label><input type="text" id="comp-gst" class="form-input"></div>
                         <div class="form-row"><label class="form-label">CIN</label><input type="text" id="comp-cin" class="form-input"></div>
                         <div class="form-row"><label class="form-label">PT Reg No</label><input type="text" id="comp-pt" class="form-input"></div>
                         <div class="form-row"><label class="form-label">LWF Reg No</label><input type="text" id="comp-lwf" class="form-input"></div>
                         <div class="form-row"><label class="form-label">Tax Circle</label><input type="text" id="comp-tax-circle" class="form-input"></div>
                         <div class="form-row"><label class="form-label">Tax CIT</label><input type="text" id="comp-tax-cit" class="form-input"></div>
                    </div>

                    <!-- PF/ESI Tab -->
                    <div id="tab-pf" class="comp-tab-content" style="display:none;">
                         <div class="erp-fieldset">
                            <div class="erp-legend">Provident Fund</div>
                            <div class="form-row"><label class="form-label">PF Code</label><input type="text" id="comp-pf-code" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Establishment ID</label><input type="text" id="comp-pf-est" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Extension</label><input type="text" id="comp-pf-ext" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Signatory</label><input type="text" id="comp-pf-sig" class="form-input"></div>
                         </div>
                         <div class="erp-fieldset">
                            <div class="erp-legend">ESI</div>
                            <div class="form-row"><label class="form-label">ESI Code</label><input type="text" id="comp-esi-code" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Local Office</label><input type="text" id="comp-esi-off" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Signatory</label><input type="text" id="comp-esi-sig" class="form-input"></div>
                         </div>
                    </div>

                     <!-- Bank Tab -->
                    <div id="tab-bank" class="comp-tab-content" style="display:none;">
                        <div class="form-row"><label class="form-label">Bank Name</label><input type="text" id="comp-bank-name" class="form-input"></div>
                        <div class="form-row"><label class="form-label">Branch</label><input type="text" id="comp-bank-branch" class="form-input"></div>
                        <div class="form-row"><label class="form-label">Account No</label><input type="text" id="comp-bank-acc" class="form-input"></div>
                        <div class="form-row"><label class="form-label">IFSC Code</label><input type="text" id="comp-bank-ifsc" class="form-input"></div>
                        <div class="form-row"><label class="form-label">Cheque Label</label><input type="text" id="comp-bank-lbl" class="form-input" placeholder="Name on Cheque"></div>
                    </div>

                    <!-- Management Tab -->
                    <div id="tab-mgmt" class="comp-tab-content" style="display:none;">
                        <div class="erp-fieldset">
                            <div class="erp-legend">Director / Auth Signatory 1</div>
                            <div class="form-row"><label class="form-label">Name</label><input type="text" id="comp-dir1-name" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Designation</label><input type="text" id="comp-dir1-desig" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Father's Name</label><input type="text" id="comp-dir1-father" class="form-input"></div>
                        </div>
                         <div class="erp-fieldset">
                            <div class="erp-legend">Director / Auth Signatory 2</div>
                            <div class="form-row"><label class="form-label">Name</label><input type="text" id="comp-dir2-name" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Designation</label><input type="text" id="comp-dir2-desig" class="form-input"></div>
                            <div class="form-row"><label class="form-label">Father's Name</label><input type="text" id="comp-dir2-father" class="form-input"></div>
                        </div>
                    </div>

                </div>

                <div class="erp-modal-footer">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-teal" onclick="resetCompForm()">New</button>
                        <button class="btn-blue" onclick="saveCompany()">Save</button>
                    </div>
                    <div style="display:flex; gap:10px;">
                         <button class="btn-gray" onclick="closeCompanyModal()">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadCompanyGrid();

    // Global Functions
    window.openCompanyModal = async (mode) => {
        document.getElementById('company-modal').classList.add('active');
        if (mode === 'new') {
            currentCompId = null;
            resetCompForm();
            document.getElementById('company-modal-title').textContent = "NEW COMPANY ENTRY";
        } else if (mode === 'edit') {
            const selected = Array.from(document.querySelectorAll('#comp-grid-body input[name="comp_select"]:checked'));
            if (selected.length === 0) {
                window.showToast("Please select a company to edit", 'info');
                window.closeCompanyModal();
                return;
            }
            if (selected.length > 1) {
                window.showToast("Select only one company to edit", 'warning');
                window.closeCompanyModal();
                return;
            }
            const compId = selected[0].closest('tr').dataset.id;
            currentCompId = compId;
            document.getElementById('company-modal-title').textContent = "EDIT COMPANY ENTRY";
            await loadCompanyToForm(compId);
        }
    };

    window.closeCompanyModal = () => document.getElementById('company-modal').classList.remove('active');

    window.deleteCompany = async () => {
        const selected = Array.from(document.querySelectorAll('#comp-grid-body input[name="comp_select"]:checked'));
        if (selected.length === 0) { window.showToast("Please select at least one company to delete", 'info'); return; }

        const ids = selected.map(chk => chk.closest('tr').dataset.id);
        const msg = ids.length === 1 ? 'Are you sure you want to delete this company?' : `Delete ${ids.length} selected companies?`;
        const ok = window.confirmDialog ? await window.confirmDialog(msg, { danger: true }) : confirm(msg);
        if (!ok) return;

        let failCount = 0;
        for (const compId of ids) {
            try { await window.electronAPI.deleteCompany(compId); }
            catch (e) { failCount++; console.error('Delete failed for', compId, e.message); }
        }
        window.showToast(failCount === 0 ? `${ids.length} company(s) deleted` : `Deleted ${ids.length - failCount}, ${failCount} failed`, failCount === 0 ? 'success' : 'warning');
        loadCompanyGrid();
    };

    // Bulk Edit Logic
    window.toggleBulkEditComp = () => {
        isBulkEdit = !isBulkEdit;
        const btn = document.getElementById('btn-bulk-edit-comp');
        const saveBtn = document.getElementById('btn-bulk-save-comp');
        btn.innerHTML = isBulkEdit ? '<i class="fas fa-times"></i> Cancel Edit' : '<i class="fas fa-table"></i> Simultaneous Edit';
        saveBtn.style.display = isBulkEdit ? 'inline-block' : 'none';
        loadCompanyGrid();
    };

    window.saveBulkEditComp = async () => {
        const rows = document.querySelectorAll('.bulk-edit-row');
        for (const row of rows) {
            const id = row.dataset.id;
            const name = row.querySelector('.bulk-name').value;
            const phone = row.querySelector('.bulk-phone').value;
            // Simple update loop
            if (name) await window.electronAPI.invoke('update-company', { id, name, phone });
        }
        window.showToast('Bulk Changes Saved');
        isBulkEdit = false;
        document.getElementById('btn-bulk-edit-comp').innerHTML = '<i class="fas fa-table"></i> Simultaneous Edit';
        document.getElementById('btn-bulk-save-comp').style.display = 'none';
        loadCompanyGrid();
    };


    window.switchCompTab = (tabName, el) => {
        document.querySelectorAll('.comp-tab-content').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.modal-tabs .modal-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tabName).style.display = 'block';
        if (el) el.classList.add('active');
    };

    window.handleLogoUpload = (input) => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 512000) { alert("File too large! Max 500KB."); input.value = ''; return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const preview = document.getElementById('comp-logo-preview');
            const placeholder = document.getElementById('logo-placeholder');
            preview.src = base64;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            // Store temporarily in a hidden place or state
            window._tempCompLogo = base64;
        };
        reader.readAsDataURL(file);
    };

    window.removeLogo = () => {
        const preview = document.getElementById('comp-logo-preview');
        const placeholder = document.getElementById('logo-placeholder');
        preview.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
        window._tempCompLogo = null;
        document.getElementById('comp-logo-input').value = '';
    };

    window.loadCompanyToForm = async (id) => {
        try {
            const companies = await window.electronAPI.getCompanies();
            const c = companies.find(c => c.id == id);
            if (!c) return;

            // General
            document.getElementById('comp-id').value = c.id;
            document.getElementById('comp-name').value = c.name;
            document.getElementById('comp-code').value = c.code || '';
            document.getElementById('comp-est').value = c.est_date || '';
            document.getElementById('comp-biz').value = c.business_type || '';
            document.getElementById('comp-phone').value = c.phone || '';
            document.getElementById('comp-phone2').value = c.phone2 || '';
            document.getElementById('comp-email').value = c.email || '';
            document.getElementById('comp-web').value = c.website || '';
            document.getElementById('comp-addr').value = c.address || '';
            document.getElementById('comp-addr2').value = c.address2 || '';
            document.getElementById('comp-city').value = c.city || '';
            document.getElementById('comp-state').value = c.state || '';
            document.getElementById('comp-pin').value = c.pin || '';

            // Statutory
            document.getElementById('comp-pan').value = c.pan || '';
            document.getElementById('comp-tan').value = c.tan || '';
            document.getElementById('comp-gst').value = c.gst || '';
            document.getElementById('comp-cin').value = c.cin || '';
            document.getElementById('comp-pt').value = c.pt_reg || '';
            document.getElementById('comp-lwf').value = c.lwf_reg || '';
            document.getElementById('comp-tax-circle').value = c.tax_circle || '';
            document.getElementById('comp-tax-cit').value = c.tax_cit || '';

            // PF/ESI
            document.getElementById('comp-pf-code').value = c.pf_code || '';
            document.getElementById('comp-pf-est').value = c.pf_est || '';
            document.getElementById('comp-pf-ext').value = c.pf_ext || '';
            document.getElementById('comp-pf-sig').value = c.pf_signatory || '';
            document.getElementById('comp-esi-code').value = c.esi_code || '';
            document.getElementById('comp-esi-off').value = c.esi_office || '';
            document.getElementById('comp-esi-sig').value = c.esi_signatory || '';

            // Bank
            document.getElementById('comp-bank-name').value = c.bank_name || '';
            document.getElementById('comp-bank-branch').value = c.bank_branch || '';
            document.getElementById('comp-bank-acc').value = c.bank_account || '';
            document.getElementById('comp-bank-ifsc').value = c.bank_ifsc || '';
            document.getElementById('comp-bank-lbl').value = c.bank_cheque_label || '';

            // Mgmt
            document.getElementById('comp-dir1-name').value = c.director1_name || '';
            document.getElementById('comp-dir1-desig').value = c.director1_designation || '';
            document.getElementById('comp-dir1-father').value = c.director1_father || '';
            document.getElementById('comp-dir2-name').value = c.director2_name || '';
            document.getElementById('comp-dir2-desig').value = c.director2_designation || '';
            document.getElementById('comp-dir2-father').value = c.director2_father || '';

            // Logo
            const preview = document.getElementById('comp-logo-preview');
            const placeholder = document.getElementById('logo-placeholder');
            if (c.logo) {
                preview.src = c.logo;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                window._tempCompLogo = c.logo;
            } else {
                preview.src = '';
                preview.style.display = 'none';
                placeholder.style.display = 'block';
                window._tempCompLogo = null;
            }

            // Switch to Gen
            window.switchCompTab('gen', document.querySelector('.modal-tab'));

        } catch (e) { console.error(e); }
    };

    window.resetCompForm = () => {
        document.querySelectorAll('.erp-modal-window input').forEach(i => i.value = '');
        document.querySelectorAll('.erp-modal-window textarea').forEach(i => i.value = '');
        window.switchCompTab('gen', document.querySelector('.modal-tab'));
    };

    window.saveCompany = async () => {
        const id = document.getElementById('comp-id').value;
        const name = document.getElementById('comp-name').value;

        if (!name) { window.showToast('Company Name is required', 'error'); return; }

        const c = {
            id: id || null,
            name: name,
            code: document.getElementById('comp-code').value,
            est_date: document.getElementById('comp-est').value,
            business_type: document.getElementById('comp-biz').value,
            phone: document.getElementById('comp-phone').value,
            phone2: document.getElementById('comp-phone2').value,
            email: document.getElementById('comp-email').value,
            website: document.getElementById('comp-web').value,
            address: document.getElementById('comp-addr').value,
            address2: document.getElementById('comp-addr2').value,
            city: document.getElementById('comp-city').value,
            state: document.getElementById('comp-state').value,
            pin: document.getElementById('comp-pin').value,

            pan: document.getElementById('comp-pan').value,
            tan: document.getElementById('comp-tan').value,
            gst: document.getElementById('comp-gst').value,
            cin: document.getElementById('comp-cin').value,
            pt_reg: document.getElementById('comp-pt').value,
            lwf_reg: document.getElementById('comp-lwf').value,
            tax_circle: document.getElementById('comp-tax-circle').value,
            tax_cit: document.getElementById('comp-tax-cit').value,

            pf_code: document.getElementById('comp-pf-code').value,
            pf_est: document.getElementById('comp-pf-est').value,
            pf_ext: document.getElementById('comp-pf-ext').value,
            pf_signatory: document.getElementById('comp-pf-sig').value,
            esi_code: document.getElementById('comp-esi-code').value,
            esi_office: document.getElementById('comp-esi-off').value,
            esi_signatory: document.getElementById('comp-esi-sig').value,

            bank_name: document.getElementById('comp-bank-name').value,
            bank_branch: document.getElementById('comp-bank-branch').value,
            bank_account: document.getElementById('comp-bank-acc').value,
            bank_ifsc: document.getElementById('comp-bank-ifsc').value,
            bank_cheque_label: document.getElementById('comp-bank-lbl').value,

            director1_name: document.getElementById('comp-dir1-name').value,
            director1_designation: document.getElementById('comp-dir1-desig').value,
            director1_father: document.getElementById('comp-dir1-father').value,
            director2_name: document.getElementById('comp-dir2-name').value,
            director2_designation: document.getElementById('comp-dir2-desig').value,
            director2_father: document.getElementById('comp-dir2-father').value,
            logo: window._tempCompLogo || null
        };

        try {
            if (currentCompId || id) {
                await window.electronAPI.invoke('update-company', c);
                window.showToast('Company Updated', 'success');
            } else {
                await window.electronAPI.addCompany(c);
                window.showToast('Company Added', 'success');
            }
            window.closeCompanyModal();
            loadCompanyGrid();
        } catch (err) {
            window.showToast('Error: ' + err.message, 'error');
        }
    };
}

async function loadCompanyGrid() {
    const tbody = document.getElementById('comp-grid-body');
    const activeCompId = window.state?.companyId || document.getElementById('ctx-company')?.value;

    try {
        const companies = await window.electronAPI.getCompanies();
        let displayList = companies;

        if (activeCompId) {
            displayList = companies.filter(c => c.id == activeCompId);
        }

        if (displayList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No Company Selected or Found</td></tr>';
            return;
        }

        tbody.innerHTML = displayList.map(c => `
            <tr data-id="${c.id}">
                    <td><input type="checkbox" name="comp_select" value="${c.id}" onclick="updateCompSelectAllState()"></td>
                    <td>${c.id}</td>
                    <td><b>${escapeHtml(c.name)}</b></td>
                    <td>CMP${c.id.toString().padStart(3, '0')}</td>
                    <td>${escapeHtml(c.address) || '-'}</td>
                    <td>${escapeHtml(c.phone) || '-'}</td>
                    <td><span class="badge success">Active</span></td>
            </tr>
        `).join('');

        window.toggleSelectAllComp = (headerChk) => {
            document.querySelectorAll('input[name="comp_select"]').forEach(c => { c.checked = headerChk.checked; });
        };

        window.updateCompSelectAllState = () => {
            const boxes = Array.from(document.querySelectorAll('input[name="comp_select"]'));
            const allChk = document.getElementById('comp-select-all');
            if (allChk) allChk.checked = boxes.length > 0 && boxes.every(c => c.checked);
        };

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7">Error Loading Data</td></tr>';
    }
}
