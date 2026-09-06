import { escapeHtml } from './utils.js';

export async function loadLetters() {
    const contentArea = document.getElementById('content-area');
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;

    contentArea.innerHTML = `
        <div class="letters-container" style="display:flex; height:100%; background:#f8fafc; font-family:'Segoe UI', sans-serif;">
            
            <!-- Sidebar: Employee List -->
            <div class="letters-sidebar" style="width:300px; background:white; border-right:1px solid #e2e8f0; display:flex; flex-direction:column;">
                <div style="padding:15px; border-bottom:1px solid #f1f5f9;">
                    <h2 style="margin:0; font-size:16px; color:#0f172a; font-weight:700;">Letters</h2>
                    <p style="margin:2px 0 10px 0; font-size:11px; color:#64748b;">Generate employee letters</p>
                    <input type="text" id="emp-search" class="erp-input" placeholder="Search employee..." 
                           style="width:100%; height:28px; font-size:12px;"
                           onkeyup="filterEmployees()">
                </div>
                <div id="emp-list" style="flex:1; overflow-y:auto; padding:10px;">
                    <div style="text-align:center; padding:20px; color:#64748b;">Loading employees...</div>
                </div>
            </div>

            <!-- Main Content: Preview & Actions -->
            <div class="letters-main" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <!-- Toolbar -->
                <div id="letters-toolbar" class="erp-toolbar" style="padding:5px 15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h3 id="selected-emp-name" style="margin:0; font-size:14px; color:#1e293b; font-weight:600;">Select an employee</h3>
                        <div class="toolbar-divider" style="width:1px; height:20px; background:#ddd;"></div>
                        <select id="letter-type" class="erp-input" style="width:180px; height:24px; font-size:11px;" onchange="updatePreview()">
                            <option value="offer">Offer Letter</option>
                            <option value="appointment">Appointment Letter</option>
                            <option value="confirmation">Confirmation Letter</option>
                            <option value="experience">Experience Letter</option>
                            <option value="relieving">Relieving Letter</option>
                        </select>
                    </div>
                    
                    <div id="letter-actions" style="display:flex; gap:5px;">
                         <button class="erp-btn" style="background:#555; color:white; border:none;" onclick="openTemplateEditor()">
                            <i class="fas fa-edit"></i> Manage
                         </button>
                         <button class="erp-btn" style="background:#555; color:white; border:none;" onclick="addNewTemplateType()">
                            <i class="fas fa-plus"></i> Type
                         </button>
                         <div class="toolbar-divider" style="width:1px; height:20px; background:#ddd;"></div>
                         <div id="export-actions" style="display:flex; gap:5px;">
                             <button class="erp-btn" style="background:#ef4444; color:white; border:none;" onclick="exportPDF()">
                                <i class="fas fa-file-pdf"></i> PDF
                             </button>
                             <button class="erp-btn" style="background:#10b981; color:white; border:none;" onclick="exportWord()">
                                <i class="fas fa-file-word"></i> Word
                             </button>
                         </div>
                    </div>
                </div>

                <!-- Preview Area -->
                <div id="letter-preview-container" style="flex:1; padding:40px; overflow-y:auto; display:flex; justify-content:center;">
                    <div id="letter-paper" style="width:210mm; min-height:297mm; background:white; padding:20mm;  font-family:'Times New Roman', Times, serif; color:#000; line-height:1.6; display:none;">
                        <!-- Rendered Template -->
                    </div>
                    <div id="empty-preview" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8;">
                         <i class="fas fa-file-alt" style="font-size:64px; margin-bottom:16px; opacity:0.3;"></i>
                         <p>Select an employee from the list to preview letter</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Template Editor Modal -->
        <div id="template-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width: 800px; height: auto;">
                <div class="erp-modal-header">
                    <span id="template-modal-title">Edit Letter Template</span>
                    <span class="erp-modal-close" onclick="closeTemplateEditor()">&times;</span>
                </div>
                <div class="erp-modal-body" style="padding:20px;">
                    <div style="margin-bottom:15px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden;">
                        <div style="padding:8px 12px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:600; color:#475569;">Click to insert:</div>
                        <div style="padding:10px; max-height:120px; overflow-y:auto; display:flex; flex-wrap:wrap; gap:6px;">
                            <div class="tag-group" style="width:100%; font-size:11px; color:#94a3b8; border-bottom:1px solid #f1f5f9; padding-bottom:4px; margin-bottom:4px;">Identity & Contact</div>
                            <button class="tag-btn" onclick="insertTag('{{first_name}}')">First Name</button>
                            <button class="tag-btn" onclick="insertTag('{{last_name}}')">Last Name</button>
                            <button class="tag-btn" onclick="insertTag('{{name}}')">Full Name</button>
                            <button class="tag-btn" onclick="insertTag('{{employee_code}}')">Employee Code</button>
                            <button class="tag-btn" onclick="insertTag('{{email}}')">Email</button>
                            <button class="tag-btn" onclick="insertTag('{{phone}}')">Phone No.</button>
                            
                            <div class="tag-group" style="width:100%; font-size:11px; color:#94a3b8; border-bottom:1px solid #f1f5f9; padding-bottom:4px; margin-bottom:4px; margin-top:8px;">Job & dates</div>
                            <button class="tag-btn" onclick="insertTag('{{designation}}')">Designation</button>
                            <button class="tag-btn" onclick="insertTag('{{department}}')">Department</button>
                            <button class="tag-btn" onclick="insertTag('{{branch}}')">Branch</button>
                            <button class="tag-btn" onclick="insertTag('{{salary}}')">Monthly Salary</button>
                            <button class="tag-btn" onclick="insertTag('{{doj}}')">DOJ</button>
                            <button class="tag-btn" onclick="insertTag('{{salary_from}}')">Salary From</button>
                            <button class="tag-btn" onclick="insertTag('{{exit_date}}')">Exit Date</button>
                            
                            <div class="tag-group" style="width:100%; font-size:11px; color:#94a3b8; border-bottom:1px solid #f1f5f9; padding-bottom:4px; margin-bottom:4px; margin-top:8px;">Personal & Address</div>
                            <button class="tag-btn" onclick="insertTag('{{father_name}}')">Father Name</button>
                            <button class="tag-btn" onclick="insertTag('{{dob}}')">DOB</button>
                            <button class="tag-btn" onclick="insertTag('{{gender}}')">Gender</button>
                            <button class="tag-btn" onclick="insertTag('{{blood_group}}')">Blood Group</button>
                            <button class="tag-btn" onclick="insertTag('{{address}}')">Full Address</button>
                            <button class="tag-btn" onclick="insertTag('{{city}}')">City</button>
                            <button class="tag-btn" onclick="insertTag('{{emergency_name}}')">Emergency Contact Name</button>
                            <button class="tag-btn" onclick="insertTag('{{emergency_phone}}')">Emergency Phone</button>
                            
                            <div class="tag-group" style="width:100%; font-size:11px; color:#94a3b8; border-bottom:1px solid #f1f5f9; padding-bottom:4px; margin-bottom:4px; margin-top:8px;">Bank & Statutory</div>
                            <button class="tag-btn" onclick="insertTag('{{bank_name}}')">Bank Name</button>
                            <button class="tag-btn" onclick="insertTag('{{account_no}}')">Account No.</button>
                            <button class="tag-btn" onclick="insertTag('{{ifsc}}')">IFSC Code</button>
                            <button class="tag-btn" onclick="insertTag('{{pan}}')">PAN Number</button>
                            <button class="tag-btn" onclick="insertTag('{{aadhaar}}')">Aadhaar Number</button>
                            <button class="tag-btn" onclick="insertTag('{{uan}}')">UAN</button>
                            <button class="tag-btn" onclick="insertTag('{{pf_no}}')">PF Number</button>
                            <button class="tag-btn" onclick="insertTag('{{esi_no}}')">ESI Number</button>
                            
                            <div class="tag-group" style="width:100%; font-size:11px; color:#94a3b8; border-bottom:1px solid #f1f5f9; padding-bottom:4px; margin-bottom:4px; margin-top:8px;">General</div>
                            <button class="tag-btn" onclick="insertTag('{{company}}')">Company Name</button>
                            <button class="tag-btn" onclick="insertTag('{{date}}')">Current Date</button>
                        </div>
                    </div>
                    <div class="editor-toolbar" style="margin-bottom:10px; padding:5px; background:#f8fafc; border:1px solid #ddd; border-bottom:none; border-radius:6px 6px 0 0; display:flex; gap:5px; align-items:center;">
                        <button class="tool-btn" onclick="format('bold')" title="Bold"><i class="fas fa-bold"></i></button>
                        <button class="tool-btn" onclick="format('italic')" title="Italic"><i class="fas fa-italic"></i></button>
                        <button class="tool-btn" onclick="format('underline')" title="Underline"><i class="fas fa-underline"></i></button>
                        <div style="width:1px; height:20px; background:#ddd; margin:0 5px;"></div>
                        <button class="tool-btn" onclick="format('justifyLeft')" title="Align Left"><i class="fas fa-align-left"></i></button>
                        <button class="tool-btn" onclick="format('justifyCenter')" title="Align Center"><i class="fas fa-align-center"></i></button>
                        <button class="tool-btn" onclick="format('justifyRight')" title="Align Right"><i class="fas fa-align-right"></i></button>
                        <button class="tool-btn" onclick="format('justifyFull')" title="Justify"><i class="fas fa-align-justify"></i></button>
                        <div style="width:1px; height:20px; background:#ddd; margin:0 5px;"></div>
                        <select onchange="format('fontSize', this.value)" class="tool-select" style="padding:2px; font-size:12px;">
                            <option value="3">Normal</option>
                            <option value="1">Small</option>
                            <option value="4">Large</option>
                            <option value="5">Huge</option>
                        </select>
                    </div>
                    <div id="template-editor" contenteditable="true" style="width:100%; height:420px; padding:20mm; border:1px solid #ddd; border-radius:0 0 6px 6px; font-family:serif; font-size:14px; line-height:1.6; overflow-y:auto; background:white; outline:none; box-sizing:border-box;" placeholder="Type your letter format here..."></div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeTemplateEditor()">Cancel</button>
                    <button class="btn-blue" onclick="saveTemplate()">Save Template</button>
                </div>
            </div>
        </div>

        <!-- NEW: Add Type Modal -->
        <div id="add-type-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width: 400px;">
                <div class="erp-modal-header">
                    <span>Add New Letter Type</span>
                    <span class="erp-modal-close" onclick="closeAddTypeModal()">&times;</span>
                </div>
                <div class="erp-modal-body" style="padding:20px;">
                    <label style="display:block; font-size:13px; color:#64748b; margin-bottom:8px;">Letter Type Name</label>
                    <input type="text" id="new-type-name" class="form-input" placeholder="e.g. Relieving Letter" style="width:100%;">
                    <p style="font-size:11px; color:#94a3b8; margin-top:8px;">This will add a new category to the dropdown list.</p>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeAddTypeModal()">Cancel</button>
                    <button class="btn-blue" onclick="confirmAddType()">Create Type</button>
                </div>
            </div>
        </div>

        <style>
            .emp-item { 
                padding:12px; margin-bottom:4px; cursor:pointer; border-radius:6px; 
                transition: all 0.2s; border:1px solid transparent;
            }
            .emp-item:hover { background: #f1f5f9; }
            .emp-item.active { background: #eff6ff; border-color: #bfdbfe; }
            .emp-item-name { font-weight:600; color:#1e293b; font-size:14px; }
            .emp-item-meta { font-size:12px; color:#64748b; }
            .tag-btn { 
                padding:4px 10px; font-size:11px; background:#f1f5f9; border:1px solid #e2e8f0; 
                border-radius:4px; cursor:pointer; color:#475569; transition:all 0.2s;
            }
            .tag-btn:hover { background: #e0e7ff; border-color: #6366f1; color: #4f46e5; }
            .tool-btn { 
                width:30px; height:30px; display:flex; align-items:center; justify-content:center; 
                background:white; border:1px solid #e2e8f0; border-radius:4px; cursor:pointer; color:#475569; 
            }
            .tool-btn:hover { background:#f1f5f9; color:#6366f1; border-color:#6366f1; }
            #template-editor:focus { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,0.1); }
        </style>
    `;

    let allEmployees = [];
    let selectedEmployee = null;
    let customTemplates = {};

    window.renderEmployeeList = (list) => {
        const container = document.getElementById('emp-list');
        if (list.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">No employees found.</div>';
            return;
        }
        container.innerHTML = list.map(e => `
            <div class="emp-item" data-id="${e.id}" onclick="selectEmployee(${e.id})">
                <div class="emp-item-name">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</div>
                <div class="emp-item-meta">${escapeHtml(e.position_title) || 'No Designation'} • ${escapeHtml(e.employee_code) || 'EMP' + e.id}</div>
            </div>
        `).join('');
    };

    // Load Data
    try {
        const res = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 1000 });
        allEmployees = res.employees || [];
        renderEmployeeList(allEmployees);

        // Load custom templates and types from settings
        const settingsArr = await window.electronAPI.allSQL("SELECT * FROM settings WHERE key LIKE 'template_%'", []);
        const select = document.getElementById('letter-type');
        const existingTypes = Array.from(select.options).map(o => o.value);

        settingsArr.forEach(s => {
            customTemplates[s.key] = s.value;
            const typeValue = s.key.replace('template_', '');
            if (!existingTypes.includes(typeValue)) {
                const opt = document.createElement('option');
                opt.value = typeValue;
                opt.textContent = typeValue.charAt(0).toUpperCase() + typeValue.slice(1).replace(/_/g, ' ') + " (Custom)";
                select.appendChild(opt);
            }
        });
    } catch (e) {
        console.error("Error initializing letters module:", e);
    }


    window.filterEmployees = () => {
        const query = document.getElementById('emp-search').value.toLowerCase();
        const filtered = allEmployees.filter(e =>
            `${e.first_name} ${e.last_name}`.toLowerCase().includes(query) ||
            (e.employee_code || '').toLowerCase().includes(query)
        );
        renderEmployeeList(filtered);
    };

    window.selectEmployee = (id) => {
        selectedEmployee = allEmployees.find(e => e.id === id);
        if (!selectedEmployee) return;

        document.querySelectorAll('.emp-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.emp-item[data-id="${id}"]`);
        if (activeItem) activeItem.classList.add('active');

        document.getElementById('selected-emp-name').textContent = `${selectedEmployee.first_name} ${selectedEmployee.last_name}`;
        document.getElementById('export-actions').style.display = 'flex';
        document.getElementById('empty-preview').style.display = 'none';
        document.getElementById('letter-paper').style.display = 'block';

        updatePreview();
    };

    window.openTemplateEditor = () => {
        const type = document.getElementById('letter-type').value;
        const modal = document.getElementById('template-modal');
        const editor = document.getElementById('template-editor');

        document.getElementById('template-modal-title').textContent = `Manage ${type.charAt(0).toUpperCase() + type.slice(1)} Template`;

        // Load existing or default
        let content = customTemplates[`template_${type}`];
        if (!content) {
            // Get default from preview logic (hacked way to get initial structure)
            const ghost = document.createElement('div');
            renderDefaultTemplate(ghost, type, true); // true for raw placeholders
            content = ghost.innerHTML.trim();
        }

        editor.innerHTML = content || '<p>Enter your template text here...</p>';
        modal.classList.add('active');
    };

    window.addNewTemplateType = () => {
        document.getElementById('new-type-name').value = '';
        document.getElementById('add-type-modal').classList.add('active');
        document.getElementById('new-type-name').focus();
    };

    window.closeAddTypeModal = () => {
        document.getElementById('add-type-modal').classList.remove('active');
    };

    window.confirmAddType = () => {
        const name = document.getElementById('new-type-name').value.trim();
        if (!name) return;

        const value = name.toLowerCase().replace(/\s+/g, '_');
        const select = document.getElementById('letter-type');

        // Avoid duplicates in dropdown
        const existing = Array.from(select.options).some(o => o.value === value);
        if (existing) {
            select.value = value;
        } else {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = name;
            select.appendChild(opt);
            select.value = value;
        }

        closeAddTypeModal();
        openTemplateEditor();
    };

    window.closeTemplateEditor = () => {
        document.getElementById('template-modal').classList.remove('active');
    };

    window.format = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
    };

    window.insertTag = (tag) => {
        // Simple insertion at cursor for contenteditable
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(tag);
            range.insertNode(textNode);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            document.getElementById('template-editor').innerHTML += tag;
        }
    };

    window.saveTemplate = async () => {
        const type = document.getElementById('letter-type').value;
        const content = document.getElementById('template-editor').innerHTML;
        const key = `template_${type}`;

        try {
            await window.electronAPI.runSQL(`
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `, [key, content]);

            customTemplates[key] = content;
            alert("Template saved successfully!");
            closeTemplateEditor();
            updatePreview();
        } catch (e) {
            alert("Save failed: " + e.message);
        }
    };

    window.updatePreview = () => {
        const type = document.getElementById('letter-type').value;
        const paper = document.getElementById('letter-paper');
        const empty = document.getElementById('empty-preview');

        // Show paper, hide empty message as soon as a type is selected or updated
        paper.style.display = 'block';
        if (empty) empty.style.display = 'none';

        const template = customTemplates[`template_${type}`];
        if (template) {
            paper.innerHTML = replacePlaceholders(template);
        } else {
            renderDefaultTemplate(paper, type);
        }
    };

    function replacePlaceholders(html, refNo = null) {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const companyName = window.state?.companyName || "Company Name";

        const se = selectedEmployee;
        const replacements = {
            // Identity & Contact
            '{{first_name}}': se ? `<strong>${escapeHtml(se.first_name)}</strong>` : `[First Name]`,
            '{{last_name}}': se ? `<strong>${escapeHtml(se.last_name)}</strong>` : `[Last Name]`,
            '{{name}}': se ? `<strong>${escapeHtml(se.first_name)} ${escapeHtml(se.last_name)}</strong>` : `[Employee Name]`,
            '{{employee_code}}': se ? `<strong>${escapeHtml(se.employee_code)}</strong>` : `[Emp Code]`,
            '{{email}}': se ? `<strong>${escapeHtml(se.email)}</strong>` : `[Email]`,
            '{{phone}}': se ? `<strong>${escapeHtml(se.phone)}</strong>` : `[Phone]`,

            // Job & Dates
            '{{designation}}': se ? `<strong>${escapeHtml(se.position_title) || 'Professional'}</strong>` : `[Designation]`,
            '{{department}}': se ? `<strong>${escapeHtml(se.department_name)}</strong>` : `[Department]`,
            '{{branch}}': se ? `<strong>${escapeHtml(se.branch_name)}</strong>` : `[Branch]`,
            '{{salary}}': se ? `<strong>Rs. ${(se.base_salary || 0).toLocaleString()}</strong>` : `[Salary]`,
            '{{doj}}': se ? `<strong>${escapeHtml(se.date_of_joining) || 'TBD'}</strong>` : `[DOJ]`,
            '{{salary_from}}': se ? `<strong>${escapeHtml(se.salary_from)}</strong>` : `[Salary From]`,
            '{{exit_date}}': se ? `<strong>${escapeHtml(se.exit_date)}</strong>` : `[Exit Date]`,

            // Personal & Address
            '{{father_name}}': se ? `<strong>${escapeHtml(se.father_name)}</strong>` : `[Father Name]`,
            '{{dob}}': se ? `<strong>${escapeHtml(se.dob)}</strong>` : `[DOB]`,
            '{{gender}}': se ? `<strong>${escapeHtml(se.gender)}</strong>` : `[Gender]`,
            '{{blood_group}}': se ? `<strong>${escapeHtml(se.blood_group)}</strong>` : `[Blood Group]`,
            '{{address}}': se ? `<strong>${escapeHtml(se.address)} ${escapeHtml(se.city)} ${escapeHtml(se.state)} ${escapeHtml(se.zip_code)}</strong>` : `[Full Address]`,
            '{{city}}': se ? `<strong>${escapeHtml(se.city)}</strong>` : `[City]`,
            '{{emergency_name}}': se ? `<strong>${escapeHtml(se.emergency_contact_name)}</strong>` : `[Emergency Contact]`,
            '{{emergency_phone}}': se ? `<strong>${escapeHtml(se.emergency_contact_phone)}</strong>` : `[Emergency Phone]`,

            // Bank & Statutory
            '{{bank_name}}': se ? `<strong>${escapeHtml(se.bank_name)}</strong>` : `[Bank Name]`,
            '{{account_no}}': se ? `<strong>${escapeHtml(se.account_number)}</strong>` : `[Account No]`,
            '{{ifsc}}': se ? `<strong>${escapeHtml(se.ifsc_code)}</strong>` : `[IFSC]`,
            '{{pan}}': se ? `<strong>${escapeHtml(se.pan_number)}</strong>` : `[PAN]`,
            '{{aadhaar}}': se ? `<strong>${escapeHtml(se.aadhaar_number)}</strong>` : `[Aadhaar]`,
            '{{uan}}': se ? `<strong>${escapeHtml(se.uan)}</strong>` : `[UAN]`,
            '{{pf_no}}': se ? `<strong>${escapeHtml(se.pf_number)}</strong>` : `[PF No]`,
            '{{esi_no}}': se ? `<strong>${escapeHtml(se.esi_number)}</strong>` : `[ESI No]`,

            // General
            '{{company}}': `<strong>${escapeHtml(companyName)}</strong>`,
            '{{date}}': today,
            '{{ref_no}}': refNo ? `<strong>${escapeHtml(refNo)}</strong>` : `[Ref No]`
        };

        let result = html;
        for (const [key, val] of Object.entries(replacements)) {
            result = result.split(key).join(val);
        }
        return result;
    }

    function renderDefaultTemplate(target, type, rawPlaceholders = false) {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const companyName = window.state?.companyName || "Company Name";

        // Professional Header
        const headerHtml = `
            <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:30px;">
                <h1 style="margin:0; font-size:24px; text-transform:uppercase;">${companyName}</h1>
                <p style="margin:5px 0; font-size:12px; color:#555;">(Head Office / Registered Branch)</p>
            </div>
        `;

        // Helper to conditionally return placeholder or value
        const p = (key, fallback) => rawPlaceholders ? `{{${key}}}` : fallback;
        const employeeName = selectedEmployee ? `<strong>${escapeHtml(selectedEmployee.first_name)} ${escapeHtml(selectedEmployee.last_name)}</strong>` : 'Employee Name';

        let innerContent = '';
        if (type === 'offer') {
            innerContent = `
                <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
                    <div><strong>Ref No:</strong> ${p('ref_no', '[Ref No]')}</div>
                    <div><strong>Date:</strong> ${p('date', today)}</div>
                </div>
                
                <div style="margin-bottom:30px;">
                    <strong>To,</strong><br>
                    <strong>${p('name', employeeName)}</strong><br>
                    ${selectedEmployee?.address || ''}<br>
                    ${selectedEmployee?.city || ''} ${selectedEmployee?.state || ''}
                </div>

                <div style="text-align:center; margin-bottom:30px;">
                    <h2 style="text-decoration:underline; font-size:20px;">LETTER OF OFFER</h2>
                </div>

                <div style="margin-bottom:20px;">
                    Dear ${p('name', selectedEmployee?.first_name || 'Candidate')},
                </div>

                <p style="text-align:justify;">
                    We are pleased to offer you the position of ${p('designation', selectedEmployee?.position_title || 'Professional')} at ${p('company', companyName)}. Your skills and experience will be a valuable asset to our team.
                </p>

                <p style="text-align:justify;">
                    Your annual CTC will be ${p('salary', `Rs. ${(selectedEmployee?.base_salary * 12 || 0).toLocaleString()}`)}. This offer is subject to successful background verification and medical fitness.
                </p>

                <p style="text-align:justify;">
                    Please signify your acceptance of this offer by signing and returning a copy of this letter.
                </p>

                <div style="margin-top:60px;">
                    Yours sincerely,<br>
                    For ${p('company', companyName)}<br><br><br>
                    <strong>HR Manager</strong>
                </div>
            `;
        } else if (type === 'appointment') {
            innerContent = `
                <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
                    <div><strong>Ref No:</strong> ${p('ref_no', '[Ref No]')}</div>
                    <div><strong>Date:</strong> ${p('date', today)}</div>
                </div>
                
                <div style="margin-bottom:30px;">
                    <strong>To,</strong><br>
                    <strong>${p('name', employeeName)}</strong><br>
                    ${selectedEmployee?.address || ''}<br>
                    ${selectedEmployee?.city || ''} ${selectedEmployee?.state || ''}
                </div>

                <div style="text-align:center; margin-bottom:30px;">
                    <h2 style="text-decoration:underline; font-size:20px;">LETTER OF APPOINTMENT</h2>
                </div>

                <div style="margin-bottom:20px;">
                    Dear ${p('name', selectedEmployee?.first_name || 'Employee')},
                </div>

                <p style="text-align:justify;">
                    With reference to your application and subsequent interview you had with us, we are pleased to appoint you as ${p('designation', selectedEmployee?.position_title || 'Professional')} in our organization on the following terms and conditions:
                </p>

                <ol style="text-align:justify;">
                    <li><strong>Date of Joining:</strong> Your appointment is effective from ${p('doj', selectedEmployee?.date_of_joining || 'TBD')}.</li>
                    <li><strong>Remuneration:</strong> Your consolidated monthly gross salary will be ${p('salary', `Rs. ${(selectedEmployee?.base_salary || 0).toLocaleString()}`)}. Detailed salary breakup will be provided separately.</li>
                    <li><strong>Probation:</strong> You will be on probation for a period of six months from the date of joining.</li>
                    <li><strong>Working Hours:</strong> You will observe the working hours as applicable to your department.</li>
                </ol>

                <p style="text-align:justify; margin-top:30px;">
                    We welcome you to ${p('company', companyName)} and look forward to a long and mutually beneficial association.
                </p>

                <div style="margin-top:60px;">
                    Yours faithfully,<br>
                    For ${p('company', companyName)}<br><br><br>
                    <strong>Authorized Signatory</strong>
                </div>
            `;
        } else if (type === 'experience') {
            innerContent = `
                <div style="text-align:right; margin-bottom:40px;">
                    <strong>Date:</strong> ${p('date', today)}
                </div>

                <div style="text-align:center; margin-bottom:60px; margin-top:40px;">
                    <h2 style="text-decoration:underline; font-size:20px;">TO WHOMSOEVER IT MAY CONCERN</h2>
                </div>

                <p style="text-align:justify; text-indent:50px;">
                    This is to certify that <strong>Mr./Ms. ${p('name', employeeName)}</strong> was employed with ${p('company', companyName)} from ${p('doj', selectedEmployee?.date_of_joining || 'TBD')} to ${p('exit_date', selectedEmployee?.exit_date || today)}.
                </p>

                <p style="text-align:justify; text-indent:50px;">
                    During this period, he/she served as ${p('designation', selectedEmployee?.position_title || 'Professional')} and performed his/her duties with diligence and sincerity. His/Her conduct and character during the tenure of employment was found to be satisfactory.
                </p>

                <p style="text-align:justify; text-indent:50px;">
                    We wish him/her all the success in his/her future endeavors.
                </p>

                <div style="margin-top:100px;">
                    For ${p('company', companyName)}<br><br><br><br>
                    <strong>Authorized Signatory</strong>
                </div>
            `;
        } else if (type === 'confirmation') {
            innerContent = `
                <div style="text-align:right; margin-bottom:40px;">
                    <strong>Date:</strong> ${p('date', today)}
                </div>

                <div style="text-align:center; margin-bottom:40px;">
                    <h2 style="text-decoration:underline; font-size:20px;">CONFIRMATION LETTER</h2>
                </div>

                <p style="text-align:justify;">
                    Dear ${p('name', selectedEmployee?.first_name || 'Employee')},
                </p>

                <p style="text-align:justify;">
                    Consequent to the successful completion of your probation period, we are pleased to confirm your services as <strong>${p('designation', selectedEmployee?.position_title || 'Professional')}</strong> at ${p('company', companyName)} with effect from <strong>${p('date', today)}</strong>.
                </p>

                <p style="text-align:justify;">
                    All other terms and conditions of your appointment remain unchanged. We look forward to your continued contribution to the growth of the organization.
                </p>

                <div style="margin-top:80px;">
                    For ${p('company', companyName)}<br><br><br>
                    <strong>Authorized Signatory</strong>
                </div>
            `;
        } else if (type === 'relieving') {
            innerContent = `
                <div style="text-align:right; margin-bottom:40px;">
                    <strong>Date:</strong> ${p('date', today)}
                </div>

                <div style="text-align:center; margin-bottom:40px;">
                    <h2 style="text-decoration:underline; font-size:20px;">RELIEVING LETTER</h2>
                </div>

                <p style="text-align:justify;">
                    Dear ${p('name', employeeName)},
                </p>

                <p style="text-align:justify;">
                    This is with reference to your resignation from the services of ${p('company', companyName)}. We wish to inform you that you are relieved from your duties at the close of business hours on <strong>${p('exit_date', selectedEmployee?.exit_date || today)}</strong>.
                </p>

                <p style="text-align:justify;">
                    We confirm that your final settlement has been completed and there are no outstanding dues. We wish you all the best in your future endeavors.
                </p>

                <div style="margin-top:80px;">
                    For ${p('company', companyName)}<br><br><br>
                    <strong>Authorized Signatory</strong>
                </div>
            `;
        }
        
        target.innerHTML = headerHtml + innerContent;
    }

    window.exportPDF = async () => {
        const { jsPDF } = window.jspdf;
        const type = document.getElementById('letter-type').value;
        const name = selectedEmployee ? selectedEmployee.first_name : 'Template';

        // Fetch Next Ref No
        const refNo = await window.electronAPI.invoke('get-next-letter-ref');

        // Create a temporary element with replaced placeholders including Ref No
        const tempElement = document.createElement('div');
        
        const customHtml = customTemplates[`template_${type}`];
        if (!customHtml) {
            // Use 'true' for rawPlaceholders to keep tags like {{ref_no}} intact for the second pass
            renderDefaultTemplate(tempElement, type, true);
            tempElement.innerHTML = replacePlaceholders(tempElement.innerHTML, refNo);
        } else {
            tempElement.innerHTML = replacePlaceholders(customHtml, refNo);
        }
        
        // Prepare for capture - visible off-screen but with explicit A4 dimensions
        tempElement.style.position = 'fixed';
        tempElement.style.left = '0';
        tempElement.style.top = '0';
        tempElement.style.zIndex = '-9999';
        tempElement.style.width = '210mm'; // Fixed A4 Width
        tempElement.style.minHeight = '297mm'; // Fixed A4 Height
        tempElement.style.background = '#ffffff'; // Solid background for capture
        tempElement.style.padding = '20mm'; // Standard Letter margins
        tempElement.style.boxSizing = 'border-box';
        tempElement.style.fontFamily = "'Times New Roman', Times, serif";
        tempElement.style.color = '#000000';
        tempElement.style.opacity = '1'; // Keep opacity 1 but z-index -9999
        tempElement.style.display = 'block';
        document.body.appendChild(tempElement);

        window.showToast("Generating PDF...", "info");

        // Use html2canvas for robust screenshot-style capture
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(tempElement, {
                    scale: 2, // High DPI
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 800
                });

                const imgData = canvas.toDataURL('image/png');
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                
                // Add the image to PDF (Full Page)
                doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
                
                doc.save(`${name}_${type}_letter.pdf`);
                window.showToast("PDF Exported!", "success");
            } catch (err) {
                console.error("PDF Generation Error:", err);
                alert("Failed to generate PDF. Check console for details.");
            } finally {
                document.body.removeChild(tempElement);
            }
        }, 250);
    };

    window.exportWord = async () => {
        const type = document.getElementById('letter-type').value;
        const name = selectedEmployee ? selectedEmployee.first_name : 'Template';

        // Fetch Next Ref No
        const refNo = await window.electronAPI.invoke('get-next-letter-ref');

        const template = customTemplates[`template_${type}`];
        let content = '';
        if (template) {
            content = replacePlaceholders(template, refNo);
        } else {
            const temp = document.createElement('div');
            renderDefaultTemplate(temp, type);
            content = replacePlaceholders(temp.innerHTML, refNo);
        }

        const filename = `${name}_${type}_letter.doc`;
        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
        const postHtml = "</body></html>";
        const html = preHtml + content + postHtml;

        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    };
}
