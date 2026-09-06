import { escapeHtml } from './utils.js';

let currentEmpId = null;
let isBulkEdit = false;
let allEmployeesCache = [];
let currentSearch = '';
let currentDept = 'all';
let currentBranch = 'all';
let sortCol = 'id';
let sortDir = 1; // 1: Asc, -1: Desc

export async function loadEmployees() {
    // Self-heal: Ensure schema is correct
    try { await window.electronAPI.invoke('fix-db-schema'); } catch (e) { }

    window.handleEmpFilter = () => {
        currentSearch = (document.getElementById('emp-search')?.value || '').toLowerCase();
        currentDept = document.getElementById('emp-filter-dept')?.value || 'all';
        currentBranch = document.getElementById('emp-filter-branch')?.value || 'all';

        let filtered = allEmployeesCache.filter(e => {
            const matchesSearch = `${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(currentSearch);
            const matchesDept = currentDept === 'all' || e.department_id == currentDept;
            const matchesBranch = currentBranch === 'all' || e.branch_id == currentBranch;
            return matchesSearch && matchesDept && matchesBranch;
        });

        // Apply Sort
        filtered.sort((a, b) => {
            let v1 = a[sortCol] || '';
            let v2 = b[sortCol] || '';
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();

            if (v1 < v2) return -1 * sortDir;
            if (v1 > v2) return 1 * sortDir;
            return 0;
        });

        renderEmployeeRows(filtered);
    };

    window.setEmpSort = (col) => {
        if (sortCol === col) sortDir *= -1;
        else { sortCol = col; sortDir = 1; }

        // Update UI headers
        document.querySelectorAll('#emp-table th i').forEach(i => i.style.opacity = '0.3');
        const targetTh = document.querySelector(`th[onclick*="setEmpSort('${col}')"] i`);
        if (targetTh) targetTh.style.opacity = '1';

        handleEmpFilter();
    };

    window.loadEmployeeGrid = async () => {
        const compId = window.state?.companyId || document.getElementById('ctx-company')?.value;
        try {
            const { employees } = await window.electronAPI.getEmployees({ companyId: compId });
            allEmployeesCache = employees;
            handleEmpFilter();
        } catch (err) {
            console.error(err);
        }
    }

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
            <!-- Main Grid Toolbar -->
            <div class="erp-toolbar" style="flex-shrink: 0; padding: 8px; background: #f1f3f4; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 5px;">
                <div class="toolbar-group">
                    <button class="erp-btn" onclick="openEmployeeModal('new')"><i class="fas fa-plus"></i> New</button>
                    <button class="erp-btn" onclick="openEmployeeModal('edit')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="erp-btn" onclick="deleteEmployee()"><i class="fas fa-trash"></i> Delete</button>
                </div>
                
                <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 5px;"></div>
                
                <div class="toolbar-group">
                    <button class="erp-btn" onclick="triggerImport()"><i class="fas fa-file-import"></i> Import</button>
                    <button class="erp-btn" onclick="exportToExcel()"><i class="fas fa-file-export"></i> Export</button>
                    <button class="erp-btn" onclick="downloadTemplate()"><i class="fas fa-download"></i> Template</button>
                </div>

                <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 5px;"></div>

                <div class="toolbar-group">
                     <button class="erp-btn" id="btn-bulk-edit" onclick="toggleBulkEdit()"><i class="fas fa-table"></i> Simultaneous Edit</button>
                     <button class="erp-btn" id="btn-bulk-save" onclick="saveBulkEdit()" style="display:none;"><i class="fas fa-save"></i> Save</button>
                </div>

                <div style="flex:1; display:flex; gap:10px; align-items:center;">
                    <!-- Filters -->
                    <select id="emp-filter-dept" onchange="handleEmpFilter()" style="padding:5px; border:1px solid #ccc; border-radius:4px; font-size:12px; background:white;">
                        <option value="all">All Dept</option>
                    </select>
                    <select id="emp-filter-branch" onchange="handleEmpFilter()" style="padding:5px; border:1px solid #ccc; border-radius:4px; font-size:12px; background:white;">
                        <option value="all">All Branches</option>
                    </select>
                </div>
                
                <!-- Search Filter -->
                <div class="search-box" style="background:white; border:1px solid #ccc; border-radius:4px; display:flex; align-items:center; padding:0 5px;">
                    <i class="fas fa-search search-icon" style="color:#888;"></i>
                    <input type="text" id="emp-search" class="search-input" placeholder="Search..." onkeyup="handleEmpFilter()" style="border:none; padding:5px; outline:none; font-size:13px; width:180px;">
                </div>
            </div>

            <!-- Employee Grid -->
            <div class="erp-grid-container" id="emp-grid-container" style="flex: 1; overflow: auto; background: white;">
                <table class="erp-table" id="emp-table" style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                        <tr style="background: #e9ecef; border-bottom: 2px solid #dee2e6;">
                            <th style="width:30px; padding: 8px; text-align: left;"><input type="checkbox" id="emp-select-all" title="Select All" onclick="toggleSelectAllEmp(this)"></th>
                            <th style="width:60px; padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('id')">ID <i class="fas fa-sort"></i></th>
                            <th style="width:80px; padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('employee_code')">Code <i class="fas fa-sort"></i></th>
                            <th style="padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('first_name')">Employee Name <i class="fas fa-sort"></i></th>
                            <th style="padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('department_name')">Department <i class="fas fa-sort"></i></th>
                            <th style="padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('designation_title')">Designation <i class="fas fa-sort"></i></th>
                            <th style="width:100px; padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('date_of_joining')">DOJ <i class="fas fa-sort"></i></th>
                            <th style="width:80px; padding: 8px; text-align: left; cursor:pointer;" onclick="setEmpSort('status')">Status <i class="fas fa-sort"></i></th>
                        </tr>
                    </thead>
                    <tbody id="emp-grid-body">
                        <!-- Loaded dynamically -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Hidden File Input for Import -->
        <input type="file" id="import-file" accept=".xlsx, .xls" style="display:none;" onchange="handleImportFile(this)">
        <input type="file" id="emp-photo-input" accept="image/*" style="display:none;" onchange="handlePhotoSelect(this)">

        <!-- THE MODAL -->
        <div id="emp-modal" class="erp-modal-overlay">
            <div class="erp-modal-window">
                <div class="erp-modal-header">
                    <span>NEW EMPLOYEE ENTRY</span>
                    <span class="erp-modal-close" onclick="closeEmployeeModal()">X</span>
                </div>
                
                <div class="erp-modal-body">
                    <!-- Top Row -->
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div class="form-col" style="width:80px;">
                            <label>Emp ID</label>
                            <input type="text" class="form-input" disabled placeholder="(Auto)" style="text-align:center; background:#eee;">
                        </div>
                         <div class="form-col" style="width:120px;">
                            <label>Code *</label>
                            <input type="text" id="emp-code-manual" class="form-input" placeholder="Manual Code">
                        </div>
                         <div class="form-col" style="flex:1;">
                            <label>Employee Name *</label>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="emp-first-name" class="form-input" placeholder="First Name" style="flex:1;">
                                <input type="text" id="emp-last-name" class="form-input" placeholder="Last Name" style="flex:1;">
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; height:100%;">
                        <!-- Left Column -->
                        <div style="flex:1;">
                            <!-- Personal Details -->
                            <div class="erp-fieldset">
                                <div class="erp-legend">Personal Details</div>
                                <div class="form-row">
                                    <label class="form-label">Father's Name</label>
                                    <input type="text" id="emp-father" class="form-input">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Gender</label>
                                    <div class="radio-group">
                                        <label><input type="radio" name="gender" value="Male" checked> Male</label>
                                        <label><input type="radio" name="gender" value="Female"> Female</label>
                                        <label><input type="radio" name="gender" value="Other"> Other</label>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Blood Group</label>
                                    <select id="emp-blood" class="form-input">
                                        <option value="">Select</option>
                                        <option>A+</option><option>A-</option>
                                        <option>B+</option><option>B-</option>
                                        <option>O+</option><option>O-</option>
                                        <option>AB+</option><option>AB-</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Classification -->
                            <div class="erp-fieldset">
                                <div class="erp-legend">Classification</div>
                                <div class="form-row">
                                    <label class="form-label">Company</label>
                                    <select id="emp-company" class="form-input"><option value="">Select Company</option></select>
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Branch</label>
                                    <select id="emp-branch" class="form-input"><option value="">Select Branch</option></select>
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Department</label>
                                    <select id="emp-dept" class="form-input" onchange="loadPositions(this.value)"><option value="">Select Dept</option></select>
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Designation</label>
                                    <select id="emp-desig" class="form-input"><option value="">Select Dept First</option></select>
                                </div>
                            </div>

                            <!-- Address Tabs -->
                            <div style="margin-top:20px;">
                                <div class="modal-tabs">
                                    <div class="modal-tab active" onclick="switchAddrTab('addr', this)">Address</div>
                                    <div class="modal-tab" onclick="switchAddrTab('contact', this)">Contact</div>
                                </div>
                                
                                <div id="tab-addr" class="tab-panel addr-tab-content">
                                    <textarea id="emp-addr" class="form-input" style="height:40px; width:100%; margin-bottom:5px;" placeholder="Residential Address"></textarea>
                                    <div style="display:flex; gap:5px;">
                                        <input type="text" id="emp-city" class="form-input" placeholder="City">
                                        <input type="text" id="emp-state" class="form-input" placeholder="State">
                                        <input type="text" id="emp-pin" class="form-input" placeholder="Pin" style="width:60px;">
                                    </div>
                                </div>

                                <div id="tab-contact" class="tab-panel addr-tab-content" style="display:none">
                                    <div class="form-row">
                                        <label class="form-label">Mobile</label>
                                        <input type="text" id="emp-phone" class="form-input">
                                    </div>
                                    <div class="form-row">
                                        <label class="form-label">Email</label>
                                        <input type="email" id="emp-email" class="form-input">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div style="flex:1;">
                            <div style="display:flex;">
                                <!-- Key Dates -->
                                <div class="erp-fieldset" style="flex:1;">
                                    <div class="erp-legend">Key Dates</div>
                                    <div class="form-row">
                                        <label class="form-label">DOB</label>
                                        <input type="date" id="emp-dob" class="form-input">
                                    </div>
                                    <div class="form-row">
                                        <label class="form-label">Joining Date *</label>
                                        <input type="date" id="emp-doj" class="form-input">
                                    </div>
                                    <div class="form-row">
                                        <label class="form-label">Salary From</label>
                                        <input type="date" id="emp-salary-from" class="form-input">
                                    </div>
                                    <div class="form-row">
                                        <label class="form-label">Status</label>
                                        <select id="emp-status" class="form-input" onchange="toggleExitDate(this.value)">
                                            <option value="Active">Active</option>
                                            <option value="Resigned">Resigned</option>
                                            <option value="Terminated">Terminated</option>
                                        </select>
                                    </div>
                                    <div class="form-row" id="div-exit-date" style="display:none;">
                                        <label class="form-label">Exit Date</label>
                                        <input type="date" id="emp-exit-date" class="form-input">
                                    </div>
                                </div>
                                
                                <!-- Photo -->
                                <div style="width:100px; padding-left:5px; text-align:center;">
                                    <div class="photo-box" id="photo-preview" style="width:100%; height:100px; border:1px solid #ccc; display:flex; align-items:center; justify-content:center; background:#f9f9f9; overflow:hidden; font-size:12px; color:#888;">
                                        Photo
                                    </div>
                                    <button class="erp-btn" style="width:100%; justify-content:center; margin-top:5px;" onclick="document.getElementById('emp-photo-input').click()">Browse</button>
                                </div>
                            </div>

                            <!-- Salary Structure -->
                            <div class="erp-fieldset">
                                <div class="erp-legend">Salary Structure (Monthly)</div>
                                <div style="display:flex; gap:15px;">
                                    <div style="flex:1;">
                                        <div class="form-row"><label class="form-label" style="width:80px;">Basic *</label><input type="number" id="sal-basic" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                        <div class="form-row"><label class="form-label" style="width:80px;">DA</label><input type="number" id="sal-da" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                        <div class="form-row"><label class="form-label" style="width:80px;">HRA</label><input type="number" id="sal-hra" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                    </div>
                                    <div style="flex:1;">
                                        <div class="form-row"><label class="form-label" style="width:80px;">Conv.</label><input type="number" id="sal-conv" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                        <div class="form-row"><label class="form-label" style="width:80px;">Medical</label><input type="number" id="sal-med" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                        <div class="form-row"><label class="form-label" style="width:80px;">Special</label><input type="number" id="sal-spl" class="form-input" onchange="calcGross()" style="text-align:right;"></div>
                                    </div>
                                </div>
                                <div style="text-align:right; font-weight:bold; margin-top:5px; border-top:1px solid #ddd; padding-top:4px;">
                                    Gross Salary: <span id="gross-display" style="background:#e6f3ff; padding:2px 8px; border-radius:3px;">0.00</span>
                                </div>
                            </div>

                             <!-- PF/ESI Details -->
                            <div class="erp-fieldset">
                                <div class="erp-legend">PF / ESI / PT Details</div>
                                <div style="margin-bottom:5px; display:flex; gap:15px; flex-wrap: wrap;">
                                    <label><input type="checkbox" id="pf-check" checked> PF Applicable</label>
                                    <label><input type="checkbox" id="esi-check"> ESI Applicable</label>
                                    <label><input type="checkbox" id="pt-check" checked> PT Applicable</label>
                                <div style="margin-bottom:5px; display:flex; gap:15px; flex-wrap: wrap;">
                                    <label title="If checked, PF is capped at the Limit Amount. If unchecked, PF is calculated on total Basic + DA."><input type="checkbox" id="pf-limit-check" checked> PF Limit</label>
                                    <input type="number" id="emp-pf-limit" class="form-input" value="15000" style="width:100px; height:22px; padding:2px 5px;" placeholder="Max Wage">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">PF Number</label>
                                    <input type="text" id="emp-pf-no" class="form-input">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">ESI Number</label>
                                    <input type="text" id="emp-esi-no" class="form-input">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">UAN</label>
                                    <input type="text" id="emp-uan" class="form-input">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="erp-modal-footer">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-teal" onclick="resetEmpForm()">New</button>
                        <button class="btn-blue" onclick="saveEmployee()">Save</button>
                    </div>
                    <div style="display:flex; gap:10px;">
                         <button class="btn-gray" onclick="closeEmployeeModal()">Close</button>
                    </div>
                </div>
            </div>
        </div>
        
            </div>
        </div>
        
        <style>
            .search-box { position:relative; width:auto; border:1px solid #ccc; background:white; border-radius:4px; display:flex; align-items:center; }
            .search-icon { margin-left:8px; color:#888; }
            .search-input { border:none; padding:6px 10px; outline:none; width:200px; font-size:13px; }
            .toolbar-divider { width:1px; background:#ddd; height:24px; margin:0 5px; }
            .toolbar-group { display:flex; gap:5px; align-items:center; }
        </style>
    `;

    loadEmployeeGrid();

    // Setup Global Functions (re-attach)

    // --- IMPORT/EXPORT LOGIC ---
    window.triggerImport = () => document.getElementById('import-file').click();

    window.handleImportFile = async (input) => {
        const file = input.files[0];
        if (!file) return;

        window.showLoader();
        let jsonData = [];
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array', cellDates: false });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        } catch (e) {
            window.hideLoader();
            return window.showToast("Failed to read Excel: " + e.message, 'error');
        }

        if (jsonData.length === 0) {
            window.hideLoader();
            return window.showToast("Excel file is empty", 'error');
        }

        window.hideLoader();
        if (!confirm(`Found ${jsonData.length} employees. Import now?`)) {
            input.value = '';
            return;
        }

        window.showLoader();
        let count = 0;
        let errors = 0;
        let errorDetails = [];

        try {
            // Pre-load all lookups for speed and to avoid 'undefined' errors
            const [depts, branches, positions] = await Promise.all([
                window.electronAPI.getDepartments(),
                window.electronAPI.getBranches(),
                window.electronAPI.getPositions()
            ]);

            const findId = (list, name) => {
                if (!name) return null;
                const searchStr = String(name).toLowerCase().trim();
                const item = list.find(x =>
                    (x.name?.toLowerCase().trim() === searchStr) ||
                    (x.title?.toLowerCase().trim() === searchStr) ||
                    (String(x.id) === searchStr)
                );
                return item ? item.id : null;
            };

            const parseDate = (val) => {
                if (!val) return null;
                // Excel Serial Number
                if (typeof val === 'number') {
                    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                    return date.toISOString().split('T')[0];
                }
                const s = String(val).trim();
                if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
                // Try DD/MM/YYYY or MM/DD/YYYY
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
            };

            // Fuzzy Header Matcher
            const getVal = (row, ...keys) => {
                for (const k of keys) {
                    // Try exact, then lowercase, then stripped spaces
                    if (row[k] !== undefined) return row[k];
                    const foundKey = Object.keys(row).find(rk => 
                        rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, '')
                    );
                    if (foundKey) return row[foundKey];
                }
                return "";
            };

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                try {
                    const payload = {
                        employee_code: getVal(row, 'Code', 'EmployeeCode', 'EmpCode', 'ID'),
                        first_name: getVal(row, 'FirstName', 'First Name', 'Name'),
                        last_name: getVal(row, 'LastName', 'Last Name', 'Surname'),
                        father_name: getVal(row, 'FatherName', 'Father Name'),
                        gender: getVal(row, 'Gender') || 'Male',
                        dob: parseDate(getVal(row, 'DOB', 'DateOfBirth', 'BirthDate')),
                        blood_group: getVal(row, 'BloodGroup', 'Blood Group'),

                        email: getVal(row, 'Email'),
                        phone: getVal(row, 'Phone', 'Mobile', 'Contact'),
                        address: getVal(row, 'Address'),
                        city: getVal(row, 'City'),
                        state: getVal(row, 'State'),
                        zip_code: getVal(row, 'ZipCode', 'Pin', 'Pincode'),

                        company_id: window.state?.companyId || document.getElementById('ctx-company')?.value || null,
                        branch_id: getVal(row, 'BranchID') || findId(branches, getVal(row, 'Branch')),
                        department_id: getVal(row, 'DepartmentID') || findId(depts, getVal(row, 'Department')),
                        position_id: getVal(row, 'DesignationID', 'PositionID') || findId(positions, getVal(row, 'Designation', 'Position')),
                        date_of_joining: parseDate(getVal(row, 'DateOfJoining', 'DOJ', 'JoiningDate')),
                        status: getVal(row, 'Status') || 'Active',
                        exit_date: parseDate(getVal(row, 'ExitDate', 'ResignationDate')),

                        bank_name: getVal(row, 'BankName', 'Bank'),
                        account_number: getVal(row, 'AccountNumber', 'AccountNo'),
                        ifsc_code: getVal(row, 'IFSC', 'IFSCCode'),
                        pan_number: getVal(row, 'PAN', 'PANCard'),
                        aadhaar_number: getVal(row, 'Aadhaar', 'AadharNumber'),

                        pf_number: getVal(row, 'PF_Number', 'PFNo'),
                        uan: getVal(row, 'UAN'),
                        esi_number: getVal(row, 'ESI_Number', 'ESINo'),

                        base_salary: parseFloat(getVal(row, 'BasicSalary', 'Basic', 'Salary')) || 0,
                        da_rate: parseFloat(getVal(row, 'DA')) || 0,
                        hra_rate: parseFloat(getVal(row, 'HRA')) || 0,
                        conveyance_allowance: parseFloat(getVal(row, 'Conveyance', 'Conv')) || 0,
                        medical_allowance: parseFloat(getVal(row, 'Medical')) || 0,
                        special_allowance_fixed: parseFloat(getVal(row, 'SpecialAllowance', 'Special')) || 0,
                        
                        is_pf_enabled: (String(getVal(row, 'PF_Applicable')).toLowerCase() === 'no') ? false : true,
                        is_esi_enabled: (String(getVal(row, 'ESI_Applicable')).toLowerCase() === 'yes') ? true : false,
                        is_pt_enabled: (String(getVal(row, 'PT_Applicable')).toLowerCase() === 'no') ? false : true
                    };

                    if (!payload.first_name) {
                        errors++;
                        errorDetails.push(`Row ${i + 2}: Missing First Name`);
                        continue;
                    }

                    await window.electronAPI.addEmployee(payload);
                    count++;
                } catch (err) {
                    console.error("Import Row Error:", err);
                    errors++;
                    errorDetails.push(`Row ${i + 2}: ${err.message}`);
                }
            }

            window.hideLoader();
            if (errors > 0) {
                console.warn("Import Errors:", errorDetails);
                window.showToast(`Imported ${count}. Failed: ${errors}`, 'warning');
                if (errors < 10) alert("Import issues:\n" + errorDetails.join('\n'));
            } else {
                window.showToast(`Successfully imported ${count} employees`, 'success');
            }
            loadEmployeeGrid();

        } catch (err) {
            window.hideLoader();
            window.showToast("Import error: " + err.message, 'error');
        } finally {
            input.value = '';
        }
    };

    window.handlePhotoSelect = (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const preview = document.getElementById('photo-preview');
            preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
            preview.dataset.base64 = base64; // Store for saving
        };
        reader.readAsDataURL(file);
    };

    window.exportToExcel = () => {
        if (allEmployeesCache.length === 0) return window.showToast("No data to export", 'warning');

        const dataToExport = allEmployeesCache.map(e => ({
            Code: e.employee_code || '',
            FirstName: e.first_name,
            LastName: e.last_name,
            FatherName: e.father_name,
            Gender: e.gender,
            DOB: e.dob,
            BloodGroup: e.blood_group,
            Department: e.department_name,
            Designation: e.position_title,
            DateOfJoining: e.date_of_joining,
            Status: e.status,
            ExitDate: e.exit_date,
            Phone: e.phone,
            Email: e.email,
            Address: e.address,
            City: e.city,
            State: e.state,
            ZipCode: e.zip_code,
            BankName: e.bank_name,
            AccountNumber: e.account_number,
            IFSC: e.ifsc_code,
            PAN: e.pan_number,
            Aadhaar: e.aadhaar_number,
            BasicSalary: e.base_salary,
            DA: e.da_rate,
            HRA: e.hra_rate,
            Conveyance: e.conveyance_allowance,
            Medical: e.medical_allowance,
            SpecialAllowance: e.special_allowance_fixed,
            PF_Number: e.pf_number,
            UAN: e.uan,
            ESI_Number: e.esi_number
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "All_Employees");
        XLSX.writeFile(wb, "Full_Employee_Export.xlsx");
        window.showToast("Export Successful", 'success');
    };

    window.downloadTemplate = () => {
        const template = [
            {
                Code: 'EMP001', FirstName: 'John', LastName: 'Doe', FatherName: 'Robert Doe', Gender: 'Male', DOB: '1990-01-01', BloodGroup: 'O+',
                Department: 'IT', Designation: 'Developer', DateOfJoining: '2024-01-01', Status: 'Active', Phone: '9999999999', Email: 'john@example.com',
                Address: 'Street 1', City: 'Mumbai', ZipCode: '400001', BankName: 'HDFC', AccountNumber: '1234567890', IFSC: 'HDFC0001234',
                PAN: 'ABCDE1234F', Aadhaar: '123412341234', BasicSalary: 50000, DA: 5000, HRA: 20000, Conveyance: 1600, Medical: 1250, SpecialAllowance: 5000,
                PF_Number: 'MH/123', UAN: '10000000000'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wscols = Object.keys(template[0]).map(k => ({ wch: k.length + 5 }));
        ws['!cols'] = wscols;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Employee_Full_Template.xlsx");
    };


    // Standard CRUD
    window.openEmployeeModal = async (mode) => {
        document.getElementById('emp-modal').classList.add('active');
        if (mode === 'new') {
            currentEmpId = null;
            resetEmpForm();
            // Auto-select current company
            const ctxComp = window.state?.companyId || document.getElementById('ctx-company')?.value;
            if (ctxComp) document.getElementById('emp-company').value = ctxComp;
        } else if (mode === 'edit') {
            const selected = Array.from(document.querySelectorAll('#emp-grid-body input[name="emp_select"]:checked'));
            if (selected.length === 0) {
                window.showToast('Please select an employee to edit', 'info');
                window.closeEmployeeModal();
                return;
            }
            if (selected.length > 1) {
                window.showToast('Select only one employee to edit', 'warning');
                window.closeEmployeeModal();
                return;
            }
            const empId = selected[0].closest('tr').dataset.id;
            currentEmpId = empId;
            await loadEmployeeToForm(empId);
        }
    };

    window.closeEmployeeModal = () => document.getElementById('emp-modal').classList.remove('active');

    window.deleteEmployee = async () => {
        const selected = Array.from(document.querySelectorAll('#emp-grid-body input[name="emp_select"]:checked'));
        if (selected.length === 0) { window.showToast('Please select at least one employee to delete', 'info'); return; }

        const ids = selected.map(chk => chk.closest('tr').dataset.id);
        const msg = ids.length === 1 ? `Are you sure you want to delete this employee?` : `Delete ${ids.length} selected employees?`;
        const ok = window.confirmDialog ? await window.confirmDialog(msg, { danger: true }) : confirm(msg);
        if (!ok) return;

        let failCount = 0;
        for (const empId of ids) {
            try { await window.electronAPI.deleteEmployee(empId); }
            catch (e) { failCount++; console.error('Delete failed for', empId, e.message); }
        }
        window.showToast(failCount === 0 ? `${ids.length} employee(s) deleted` : `Deleted ${ids.length - failCount}, ${failCount} failed`, failCount === 0 ? 'success' : 'warning');
        loadEmployeeGrid();
    };

    window.loadEmployeeToForm = async (id) => {
        try {
            const emp = allEmployeesCache.find(e => e.id == id);
            if (!emp) return;

            // Populate Form
            document.getElementById('emp-code-manual').value = emp.employee_code || '';
            document.getElementById('emp-first-name').value = emp.first_name;
            document.getElementById('emp-last-name').value = emp.last_name;
            document.getElementById('emp-father').value = emp.father_name || '';

            // Radio
            const r = document.querySelector(`input[name="gender"][value="${emp.gender}"]`);
            if (r) r.checked = true;

            document.getElementById('emp-blood').value = emp.blood_group || '';
            document.getElementById('emp-company').value = emp.company_id || '';
            document.getElementById('emp-branch').value = emp.branch_id || '';
            document.getElementById('emp-dept').value = emp.department_id || '';

            // Trigger Load positions
            await window.loadPositions(emp.department_id);
            document.getElementById('emp-desig').value = emp.position_id || '';

            document.getElementById('emp-addr').value = emp.address || '';
            document.getElementById('emp-city').value = emp.city || '';
            document.getElementById('emp-state').value = emp.state || '';
            document.getElementById('emp-pin').value = emp.zip_code || '';
            document.getElementById('emp-phone').value = emp.phone || '';
            document.getElementById('emp-email').value = emp.email || '';
            document.getElementById('emp-dob').value = emp.dob || '';
            document.getElementById('emp-doj').value = emp.date_of_joining || '';
            document.getElementById('emp-salary-from').value = emp.salary_from || '';
            document.getElementById('emp-status').value = emp.status || 'Active';

            // Trigger Toggle
            window.toggleExitDate(emp.status || 'Active');
            document.getElementById('emp-exit-date').value = emp.exit_date || '';

            document.getElementById('sal-basic').value = emp.base_salary || 0;
            document.getElementById('sal-da').value = emp.da_rate || 0;
            document.getElementById('sal-hra').value = emp.hra_rate || 0;
            document.getElementById('sal-conv').value = emp.conveyance_allowance || 0;
            document.getElementById('sal-med').value = emp.medical_allowance || 0;
            document.getElementById('sal-spl').value = emp.special_allowance_fixed || 0;

            document.getElementById('emp-pf-no').value = emp.pf_number || '';
            document.getElementById('emp-esi-no').value = emp.esi_number || '';
            document.getElementById('emp-uan').value = emp.uan || '';

            document.getElementById('pf-check').checked = (emp.is_pf_enabled !== 0 && emp.is_pf_enabled !== false);
            document.getElementById('esi-check').checked = (emp.is_esi_enabled === 1 || emp.is_esi_enabled === true);
            document.getElementById('pt-check').checked = (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false);
            document.getElementById('pf-limit-check').checked = (emp.pf_limit_enabled !== 0 && emp.pf_limit_enabled !== false);
            document.getElementById('emp-pf-limit').value = emp.pf_limit || 15000;

            window.calcGross();

            // Photo
            const preview = document.getElementById('photo-preview');
            if (emp.photo) {
                preview.innerHTML = `<img src="${emp.photo}" style="width:100%; height:100%; object-fit:cover;">`;
                preview.dataset.base64 = emp.photo;
            } else {
                preview.innerHTML = "Photo";
                delete preview.dataset.base64;
            }

        } catch (e) { console.error(e); }
    };

    window.switchAddrTab = (tabName, el) => {
        document.querySelectorAll('.addr-tab-content').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.modal-tabs .modal-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tabName).style.display = 'block';
        el.classList.add('active');
    };

    window.calcGross = () => {
        const fields = ['sal-basic', 'sal-da', 'sal-hra', 'sal-conv', 'sal-med', 'sal-spl'];
        let total = 0;
        fields.forEach(f => total += Number(document.getElementById(f).value || 0));
        document.getElementById('gross-display').textContent = total.toFixed(2);
    };

    window.toggleExitDate = (status) => {
        const div = document.getElementById('div-exit-date');
        if (status === 'Resigned' || status === 'Terminated') {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
            document.getElementById('emp-exit-date').value = '';
        }
    };

    try {
        const res = await window.electronAPI.getEmployees({ companyId: window.state?.companyId, page: 1, limit: 1000 });
        allEmployeesCache = res.employees;

        // Populate Depts/Branches Filters
        const [depts, branches] = await Promise.all([
            window.electronAPI.getDepartments(),
            window.electronAPI.getBranches()
        ]);

        const dSel = document.getElementById('emp-filter-dept');
        const bSel = document.getElementById('emp-filter-branch');

        if (dSel) {
            dSel.innerHTML = '<option value="all">All Dept</option>';
            depts.forEach(d => dSel.innerHTML += `<option value="${d.id}">${d.name}</option>`);
        }
        if (bSel) {
            bSel.innerHTML = '<option value="all">All Branches</option>';
            branches.forEach(b => bSel.innerHTML += `<option value="${b.id}">${b.name}</option>`);
        }

        handleEmpFilter();
    } catch (e) {
        console.error("Load Employees error:", e);
    }

    loadEmployeeDropdowns();
}


function renderEmployeeRows(data) {
    const tbody = document.getElementById('emp-grid-body');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No Employees Found</td></tr>';
        return;
    }

    if (isBulkEdit) {
        tbody.innerHTML = data.map(e => `
            <tr data-id="${e.id}" class="bulk-edit-row">
                 <td><input type="checkbox" name="emp_select" value="${e.id}" disabled></td>
                 <td>${e.id}</td>
                 <td><input type="text" class="form-input bulk-code" value="${escapeHtml(e.employee_code)}" style="width:80px;"></td> <!-- EDIT CODE -->
                 <td>
                    <input type="text" class="form-input bulk-fname" value="${escapeHtml(e.first_name)}" placeholder="First Name" style="width:100px;">
                    <input type="text" class="form-input bulk-lname" value="${escapeHtml(e.last_name)}" placeholder="Last Name" style="width:100px;">
                 </td>
                 <td>${getDeptDropdownHTML(e.department_id)}</td>
                 <td>${getPosDropdownHTML(e.position_id)}</td>
                 <td><input type="date" class="form-input bulk-doj" value="${escapeHtml(e.date_of_joining)}" style="width:110px;"></td>
                 <td>
                    <select class="form-input bulk-status" style="width:80px;">
                        <option value="Active" ${e.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Resigned" ${e.status === 'Resigned' ? 'selected' : ''}>Resigned</option>
                        <option value="Terminated" ${e.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
                    </select>
                 </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = data.map(e => `
            <tr data-id="${e.id}">
                 <td><input type="checkbox" name="emp_select" value="${e.id}" onclick="updateEmpSelectAllState()"></td>
                 <td>${e.id}</td>
                 <td>${escapeHtml(e.employee_code)}</td>
                 <td><b>${escapeHtml(e.first_name)}</b> ${escapeHtml(e.last_name)}</td>
                 <td>${escapeHtml(e.department_name) || '-'}</td>
                 <td>${escapeHtml(e.position_title) || '-'}</td>
                 <td>${escapeHtml(e.date_of_joining) || '-'}</td>
                 <td><span class="badge ${e.status === 'Active' ? 'success' : 'danger'}">${escapeHtml(e.status) || 'Active'}</span></td>
            </tr>
        `).join('');
    }

    window.selectOnlyThis = (chk) => {
        document.querySelectorAll('input[name="emp_select"]').forEach(c => {
            if (c !== chk) c.checked = false;
        });
    };

    window.toggleSelectAllEmp = (headerChk) => {
        document.querySelectorAll('input[name="emp_select"]').forEach(c => { c.checked = headerChk.checked; });
    };

    window.updateEmpSelectAllState = () => {
        const boxes = Array.from(document.querySelectorAll('input[name="emp_select"]'));
        const allChk = document.getElementById('emp-select-all');
        if (allChk) allChk.checked = boxes.length > 0 && boxes.every(c => c.checked);
    };
}

async function loadEmployeeDropdowns() {
    try {
        const companies = await window.electronAPI.getCompanies();
        const deps = await window.electronAPI.getDepartments();

        const cSelect = document.getElementById('emp-company');

        // Lock to current context
        const currentCompId = window.state?.companyId || document.getElementById('ctx-company')?.value;
        if (currentCompId) {
            const activeComp = companies.find(c => c.id == currentCompId);
            if (activeComp) {
                cSelect.innerHTML = `<option value="${activeComp.id}" selected>${escapeHtml(activeComp.name)}</option>`;
                cSelect.disabled = true;
                cSelect.style.backgroundColor = "#eee";
                cSelect.style.color = "#555";
            } else {
                // Fallback if not found (shouldn't happen)
                cSelect.innerHTML = '<option value="">Select Company</option>' + companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
            }
        } else {
            cSelect.innerHTML = '<option value="">Select Company</option>' + companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        }

        const dSelect = document.getElementById('emp-dept');
        dSelect.innerHTML = '<option value="">Select Dept</option>' + deps.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');

        // Load Branches
        const branches = await window.electronAPI.getBranches();
        const bSelect = document.getElementById('emp-branch');
        if (currentCompId) {
            const compBranches = branches.filter(b => b.company_id == currentCompId);
            bSelect.innerHTML = '<option value="">Select Branch</option>' + compBranches.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
        } else {
            bSelect.innerHTML = '<option value="">Select Company First</option>';
        }

    } catch (e) { console.error(e); }
}

window.loadPositions = async (deptId) => {
    const pSelect = document.getElementById('emp-desig');
    /* 
       ALLOW LOADING WITHOUT DEPT if specific requirement, but usually filtering is better.
       If deptId is empty, show all positions or clear? User asked why it's not showing.
       Let's show ALL positions if deptId is null/empty for flexibility, or fix the filter.
    */
    try {
        const positions = await window.electronAPI.getPositions();
        let filtered = positions;
        if (deptId) {
            filtered = positions.filter(p => !p.department_id || p.department_id == deptId);
        }

        if (filtered.length === 0) {
            pSelect.innerHTML = '<option value="">No Designations Found</option>';
        } else {
            pSelect.innerHTML = '<option value="">Select Designation</option>' + filtered.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
        }
    } catch (e) {
        pSelect.innerHTML = '<option value="">Error Loading</option>';
    }
};

window.resetEmpForm = () => {
    document.querySelectorAll('.erp-modal-window input:not([type="radio"])').forEach(i => i.value = '');
    document.querySelectorAll('.erp-modal-window select').forEach(i => i.selectedIndex = 0);
    document.getElementById('pf-check').checked = true;
    document.getElementById('esi-check').checked = false;
    document.getElementById('pt-check').checked = true;
    document.getElementById('pf-limit-check').checked = true;
    document.getElementById('emp-pf-limit').value = 15000;
    document.getElementById('gross-display').textContent = "0.00";
    document.getElementById('emp-status').value = 'Active';
    document.querySelector('input[name="gender"][value="Male"]').checked = true;

    const preview = document.getElementById('photo-preview');
    preview.innerHTML = "Photo";
    delete preview.dataset.base64;
    document.getElementById('emp-photo-input').value = '';
    document.getElementById('emp-salary-from').value = '';
};

window.saveEmployee = async () => {
    const fname = document.getElementById('emp-first-name').value;
    const lname = document.getElementById('emp-last-name').value;
    const doj = document.getElementById('emp-doj').value;

    if (!fname) return window.showToast('First Name is required', 'error');
    if (!doj) return window.showToast('Joining Date is required', 'error');

    // DOB Validation (18+)
    const dobVal = document.getElementById('emp-dob').value;
    if (dobVal) {
        const dobDate = new Date(dobVal);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
        }
        if (age < 18) {
            return window.showToast('Employee must be at least 18 years old.', 'error');
        }
    }

    // Validate Code? No strict check, but good to have
    const code = document.getElementById('emp-code-manual').value;

    const data = {
        first_name: fname,
        last_name: lname,
        employee_code: code,
        father_name: document.getElementById('emp-father').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value || 'Male',
        blood_group: document.getElementById('emp-blood').value,

        company_id: document.getElementById('emp-company').value || null,
        branch_id: document.getElementById('emp-branch').value || null,
        department_id: document.getElementById('emp-dept').value || null,
        position_id: document.getElementById('emp-desig').value || null,

        address: document.getElementById('emp-addr').value,
        city: document.getElementById('emp-city').value,
        state: document.getElementById('emp-state').value,
        zip_code: document.getElementById('emp-pin').value,

        phone: document.getElementById('emp-phone').value,
        email: document.getElementById('emp-email').value,

        dob: document.getElementById('emp-dob').value,
        date_of_joining: document.getElementById('emp-doj').value,
        salary_from: document.getElementById('emp-salary-from').value,
        status: document.getElementById('emp-status').value,
        exit_date: document.getElementById('emp-exit-date').value || null,

        base_salary: document.getElementById('sal-basic').value || 0,
        da_rate: document.getElementById('sal-da').value || 0,
        hra_rate: document.getElementById('sal-hra').value || 0,
        conveyance_allowance: document.getElementById('sal-conv').value || 0,
        medical_allowance: document.getElementById('sal-med').value || 0,
        special_allowance_fixed: document.getElementById('sal-spl').value || 0,

        pf_number: document.getElementById('emp-pf-no').value,
        esi_number: document.getElementById('emp-esi-no').value,
        uan: document.getElementById('emp-uan').value,
        is_pf_enabled: document.getElementById('pf-check').checked,
        is_esi_enabled: document.getElementById('esi-check').checked,
        is_pt_enabled: document.getElementById('pt-check').checked,
        pf_limit_enabled: document.getElementById('pf-limit-check').checked,
        pf_limit: document.getElementById('emp-pf-limit').value || 15000,
        photo: document.getElementById('photo-preview').dataset.base64 || null
    };

    try {
        if (currentEmpId) {
            data.id = currentEmpId;
            await window.electronAPI.updateEmployee(data);
            window.showToast('Employee Updated', 'success');
        } else {
            await window.electronAPI.addEmployee(data);
            window.showToast('Employee Added', 'success');
        }
        window.closeEmployeeModal();
        loadEmployeeGrid();
    } catch (err) {
        console.error(err);
        window.showToast('Error: ' + err.message, 'error');
    }
};

// --- Bulk Edit Helpers ---
let allDepts = [];
let allPositions = [];

window.toggleBulkEdit = async () => {
    isBulkEdit = !isBulkEdit;
    const btn = document.getElementById('btn-bulk-edit');
    if (btn) btn.innerHTML = isBulkEdit ? '<i class="fas fa-times"></i> Cancel Edit' : '<i class="fas fa-table"></i> Simultaneous Edit';

    const saveBtn = document.getElementById('btn-bulk-save');
    if (saveBtn) saveBtn.style.display = isBulkEdit ? 'inline-block' : 'none';

    if (isBulkEdit) {
        // Pre-fetch for dropdowns
        try {
            allDepts = await window.electronAPI.getDepartments();
            allPositions = await window.electronAPI.getPositions();
        } catch (e) { console.error(e); }
    }
    // Re-render
    renderEmployeeRows(allEmployeesCache);
};

window.saveBulkEdit = async () => {
    const rows = document.querySelectorAll('.bulk-edit-row');
    const updates = [];

    rows.forEach(row => {
        const id = row.dataset.id;
        const code = row.querySelector('.bulk-code').value; // Added code edit
        const fname = row.querySelector('.bulk-fname').value;
        const lname = row.querySelector('.bulk-lname').value;
        const status = row.querySelector('.bulk-status').value;
        const deptId = row.querySelector('.bulk-dept').value;
        const posId = row.querySelector('.bulk-pos').value;
        const doj = row.querySelector('.bulk-doj').value;

        updates.push({
            id: id,
            employee_code: code,
            first_name: fname,
            last_name: lname,
            status: status,
            department_id: deptId || null,
            position_id: posId || null,
            date_of_joining: doj || null
        });
    });

    if (updates.length === 0) return;

    try {
        const btn = document.getElementById('btn-bulk-save');
        btn.textContent = 'Saving...';
        await window.electronAPI.invoke('update-employee-bulk', updates);
        window.showToast('Bulk Update Successful', 'success');

        isBulkEdit = false;
        document.getElementById('btn-bulk-edit').innerHTML = '<i class="fas fa-table"></i> Simultaneous Edit';
        document.getElementById('btn-bulk-save').style.display = 'none';
        loadEmployeeGrid();

    } catch (e) {
        window.showToast('Error: ' + e.message, 'error');
    } finally {
        if (document.getElementById('btn-bulk-save')) document.getElementById('btn-bulk-save').innerHTML = '<i class="fas fa-save"></i> Save';
    }
};

function getDeptDropdownHTML(currentId) {
    const opts = (allDepts || []).map(d => `<option value="${d.id}" ${d.id == currentId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('');
    return `<select class="form-input bulk-dept" style="width:100px;"><option value="">-</option>${opts}</select>`;
}

function getPosDropdownHTML(currentId) {
    const opts = (allPositions || []).map(p => `<option value="${p.id}" ${p.id == currentId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('');
    return `<select class="form-input bulk-pos" style="width:100px;"><option value="">-</option>${opts}</select>`;
}

