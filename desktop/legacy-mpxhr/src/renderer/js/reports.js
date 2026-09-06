import { escapeHtml } from './utils.js';

export function loadReports() {
    const contentArea = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;

    // Reports Configuration
    const reportTypes = [
        { id: 'emp_master', icon: '👥', label: 'Employee Master List', desc: 'Active employees with personal & salary details.' },
        { id: 'att_log', icon: '📅', label: 'Monthly Attendance Log', desc: 'Detailed daily attendance status.' },
        { id: 'sal_sheet', icon: '💸', label: 'Salary Sheet', desc: 'Monthly payroll statement with deductions.' },
        { id: 'pf_esi', icon: '🏦', label: 'PF & ESI Statement', desc: 'Provident Fund and ESI contribution report.' },
        { id: 'bank_adv', icon: '💳', label: 'Bank Advice', desc: 'Net pay list for bank transfer.' },
        { id: 'tax_rep', icon: '⚖️', label: 'TDS & Tax Report', desc: 'Tax deductions and projections.' },
        { id: 'yearly_salary', icon: '📅', label: 'Yearly Salary Register', desc: 'Annual salary summary per employee.' },
        { id: 'dept_summary', icon: '🏢', label: 'Department Summary', desc: 'Cost analysis by department.' },
        { id: 'form16', icon: '📃', label: 'Form 16', desc: 'Annual salary & TDS certificate per employee.' },
        { id: 'dynamic', icon: '⚙️', label: 'Custom Report Builder', desc: 'Create your own reports.' }
    ];

    // Layout
    contentArea.innerHTML = `
        <div class="reports-container" style="display:flex; height:100%; background:#f8fafc; font-family:'Segoe UI', sans-serif;">
            
            <!-- Sidebar -->
            <div class="reports-sidebar" style="width:260px; background:white; border-right:1px solid #e2e8f0; display:flex; flex-direction:column;">
                <div style="padding:15px; border-bottom:1px solid #f1f5f9;">
                    <h2 style="margin:0; font-size:16px; color:#0f172a; font-weight:700;">Reports Center</h2>
                    <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Select a report to generate</p>
                </div>
                <div id="report-list" style="flex:1; overflow-y:auto; padding:12px;">
                    ${reportTypes.map(r => `
                        <div class="report-item" data-id="${r.id}" onclick="selectReport('${r.id}')">
                            <div class="rep-icon">${r.icon}</div>
                            <div class="rep-info">
                                <div class="rep-label">${r.label}</div>
                                <div class="rep-desc">${r.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Main Content -->
            <div class="reports-main" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <!-- Toolbar -->
                <div id="report-toolbar" class="erp-toolbar" style="padding:5px 15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h3 id="active-report-title" style="margin:0; font-size:14px; color:#1e293b; font-weight:600;">Select a Report</h3>
                        
                        <div class="toolbar-divider" style="width:1px; height:20px; background:#ddd;"></div>

                        <!-- Month Filter -->
                        <div id="filter-month-container" style="display:none;">
                            <input type="month" id="report-month" class="erp-input" 
                                   style="width:130px; height:24px; font-size:11px;"
                                   value="${new Date().toISOString().slice(0, 7)}" 
                                   onchange="loadReportData()">
                        </div>

                        <!-- Year Filter -->
                        <div id="filter-year-container" style="display:none;">
                            <select id="report-year" class="erp-input" style="width:80px; height:24px; font-size:11px;" onchange="loadReportData()">
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026" selected>2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>

                         <!-- Employee Filter -->
                         <div id="filter-emp-container" style="display:none;">
                            <button id="btn-emp-filter" class="erp-btn" onclick="openEmpFilterModal()">
                                <i class="fas fa-users"></i> All Employees
                            </button>
                        </div>
                    </div>
                    
                    <div id="report-actions" style="display:none; gap:5px;">
                         <button class="erp-btn " onclick="openReportSettings()">
                            <i class="fas fa-cog"></i> 
                         </button>
                    </div>
                </div>

                <!-- Content Area -->
                <div style="flex:1; padding:20px; overflow:hidden; display:flex; flex-direction:column;">
                    <div style="background:white; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05); flex:1; display:flex; flex-direction:column; overflow:hidden; border:1px solid #e2e8f0; position:relative;">
                        
                        <!-- Table Wrapper -->
                        <div style="flex:1; overflow:auto; padding-bottom:10px;">
                            <table class="modern-table" id="report-table" style="display:none;">
                                <thead>
                                    <tr id="report-header-row"></tr>
                                </thead>
                                <tbody id="report-body"></tbody>
                            </table>
                            
                            <div id="empty-state" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; pointer-events:none;">
                                <div style="font-size:48px; margin-bottom:16px; opacity:0.5;">📊</div>
                                <div style="font-size:15px;">Select a report from the sidebar to view data</div>
                            </div>

                            <!-- Dynamic Builder UI -->
                            <div id="dynamic-builder" style="display:none; padding:30px; color:#334155;">
                                <div style="max-width:800px; margin:0 auto;">
                                    <h3 style="margin-top:0; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">Custom Report Builder</h3>
                                    
                                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:30px;">
                                        <div>
                                            <label class="form-label">Data Source</label>
                                            <select id="dyn-source" class="form-select" onchange="loadDynamicSchema()">
                                                <option value="" disabled selected>Select Source...</option>
                                                <option value="employees">Employees</option>
                                                <option value="payroll">Payroll History</option>
                                                <option value="attendance">Attendance Logs</option>
                                            </select>
                                        </div>
                                        <div id="dyn-filter-month" style="display:none;">
                                            <label class="form-label">Period</label>
                                            <input type="month" id="dyn-month" class="form-input" value="${new Date().toISOString().slice(0, 7)}">
                                        </div>
                                    </div>

                                    <div id="dyn-cols-container" style="display:none; margin-bottom:30px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                            <label class="form-label" style="margin:0;">Select Columns to Include:</label>
                                            <div>
                                                <a href="#" onclick="event.preventDefault(); toggleAllDynCols(true)" style="font-size:12px; margin-right:10px;">Select All</a>
                                                <a href="#" onclick="event.preventDefault(); toggleAllDynCols(false)" style="font-size:12px;">Deselect All</a>
                                            </div>
                                        </div>
                                        <div id="dyn-cols-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px; background:#f8fafc; padding:15px; border-radius:6px; border:1px solid #e2e8f0;"></div>
                                    </div>

                                    <div id="dyn-actions" style="display:none;">
                                        <button class="erp-btn" onclick="generateDynamicReport()">
                                            <i class="fas fa-cog"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Form 16 Builder -->
                            <div id="form16-builder" style="display:none; padding:30px; color:#334155;">
                                <div style="max-width:520px; margin:0 auto;">
                                    <h3 style="margin-top:0; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">Form 16 — Annual Salary & TDS Certificate</h3>
                                    <div class="form-row"><label class="form-label">Employee</label>
                                        <select id="f16-emp" class="form-input"></select>
                                    </div>
                                    <div class="form-row"><label class="form-label">Financial Year</label>
                                        <select id="f16-fy" class="form-input"></select>
                                    </div>
                                    <button class="btn-blue" style="margin-top:10px;" onclick="generateForm16()"><i class="fas fa-file-pdf"></i> Generate Form 16 PDF</button>
                                    <p style="font-size:11px; color:#94a3b8; margin-top:16px;">Summarizes salary paid and TDS deducted from payroll records for the selected financial year (April–March). This is a simplified certificate, not a statutory e-filed Form 16.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STYLES -->
        <style>
            /* Layout & Sidebar */
            .report-item { 
                padding:12px 14px; margin-bottom:6px; cursor:pointer; border-radius:6px; 
                border:1px solid transparent; display:flex; gap:12px; align-items:flex-start;
                transition: all 0.2s ease;
            }
            .report-item:hover { background: #f1f5f9; }
            .report-item.active { background: #eff6ff; border-color: #bfdbfe; }
            .report-item.active .rep-label { color: #2563eb; }
            .report-item.active .rep-icon { color: #2563eb; }
            
            .rep-icon { font-size:18px; color:#64748b; margin-top:2px; }
            .rep-info { flex:1; }
            .rep-label { font-weight:600; color:#334155; font-size:14px; margin-bottom:2px; }
            .rep-desc { font-size:12px; color:#94a3b8; line-height:1.4; }

            /* Toolbar */
            .toolbar-input { padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none; color:#334155; }
            .toolbar-input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.1); }
            .toolbar-btn { 
                padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; background:white; 
                font-size:13px; color:#475569; cursor:pointer; display:flex; align-items:center; gap:8px; 
                transition:all 0.1s;
            }
            .toolbar-btn:hover { background:#f8fafc; border-color:#94a3b8; }
            .toolbar-btn.primary { background:#3b82f6; border-color:#2563eb; color:white; }
            .toolbar-btn.primary:hover { background:#2563eb; }
            .v-divider { width:1px; height:24px; background:#e2e8f0; }

            /* Modern Table & Sticky Cols */
            .modern-table { width:100%; border-collapse:separate; border-spacing:0; }
            .modern-table th, .modern-table td {
                padding: 10px 16px;
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #f1f5f9;
                font-size: 13px;
                white-space: nowrap;
                color: #334155;
            }
            .modern-table th {
                background: #f8fafc;
                color: #475569;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
                position: sticky;
                top: 0;
                z-index: 20;
                border-bottom: 2px solid #e2e8f0;
            }
            
            /* Sticky First Column Logic */
            .modern-table th:first-child, .modern-table td:first-child {
                position: sticky;
                left: 0;
                background: #fff;
                z-index: 10;
                border-right: 2px solid #e2e8f0;
                box-shadow: 2px 0 5px rgba(0,0,0,0.02); /* Subtle shadow for depth */
            }
            .modern-table th:first-child { z-index: 30; background: #f8fafc; }
            
            /* Row Hover */
            .modern-table tr:hover td { background: #f8fafc; }
            .modern-table tr:hover td:first-child { background: #f8fafc; }

            /* Checkbox Label Support */
            .col-checkbox-label {
                display:flex; align-items:center; gap:10px; font-size:13px; cursor:pointer;
                padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
                transition: all 0.2s;
            }
            .col-checkbox-label:hover { border-color: #cbd5e1; background: #f8fafc; }
            .col-checkbox-label input { accent-color: #3b82f6; width: 16px; height: 16px; margin:0; }

            /* Scrollbar */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
            ::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

            /* Form Elements */
            .form-label { display:block; margin-bottom:6px; font-weight:600; font-size:13px; color:#475569; }
            .form-select, .form-input { width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; outline:none; box-sizing:border-box; }
            .btn-blue.lg { padding:10px 20px; font-size:14px; }
        </style>

        <!-- Modals (Export & Filter) - Kept mostly same but styled -->
        <div id="export-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width: 500px; border-radius:8px; overflow:hidden;">
                <div class="erp-modal-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:15px 20px;">
                    <span style="font-weight:600; color:#1e293b;">Customize Report Columns</span>
                    <span class="erp-modal-close" onclick="closeExportModal()">×</span>
                </div>
                <div class="erp-modal-body" style="padding:0; background:white; display:flex; flex-direction:column; height:60vh;">
                     <div style="padding:10px 20px; border-bottom:1px solid #f1f5f9; display:flex; gap:10px;">
                        <button class="toolbar-btn" onclick="toggleAllReportCols(true)">Select All</button>
                        <button class="toolbar-btn" onclick="toggleAllReportCols(false)">Deselect All</button>
                    </div>
                    <div id="export-cols-list" style="padding:20px; overflow-y:auto; flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:12px;"></div>
                </div>
                <div class="erp-modal-footer" style="background:#f8fafc; padding:15px 20px; border-top:1px solid #e2e8f0;">
                    <button class="btn-blue" onclick="applyReportViewColumns()">Apply View</button>
                    <button class="btn-teal" onclick="confirmExport()">Export CSV</button>
                </div>
            </div>
        </div>

        <div id="emp-filter-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width: 400px; border-radius:8px; overflow:hidden;">
                <div class="erp-modal-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <span style="font-weight:600;">Filter Employees</span>
                    <span class="erp-modal-close" onclick="document.getElementById('emp-filter-modal').classList.remove('active')">×</span>
                </div>
                <div class="erp-modal-body" style="padding:0; display:flex; flex-direction:column; height:60vh; background:white;">
                     <div style="padding:10px; border-bottom:1px solid #f1f5f9; display:flex; gap:10px;">
                        <button class="toolbar-btn" onclick="toggleAllEmpFilter(true)">Select All</button>
                        <button class="toolbar-btn" onclick="toggleAllEmpFilter(false)">None</button>
                    </div>
                    <div id="emp-filter-list" style="padding:10px; flex:1; overflow-y:auto;"></div>
                </div>
                <div class="erp-modal-footer" style="padding:15px; border-top:1px solid #f1f5f9;">
                    <button class="btn-blue" style="width:100%;" onclick="applyEmpFilter()">Apply Filter</button>
                </div>
            </div>
        </div>
    `;

    // State
    let currentReportId = null;
    let currentData = [];
    let allEmployeesForFilter = [];
    let selectedEmpIds = new Set(); // Empty means ALL

    // --- Actions ---

    window.selectReport = async (id) => {
        currentReportId = id;

        // UI Updates
        document.querySelectorAll('.report-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.report-item[data-id="${id}"]`).classList.add('active');

        const r = reportTypes.find(x => x.id === id);
        document.getElementById('active-report-title').textContent = r.label;
        document.getElementById('empty-state').style.display = 'none';

        if (id === 'dynamic') {
            document.getElementById('report-table').style.display = 'none';
            document.getElementById('report-actions').style.display = 'none'; // Custom export later?
            document.getElementById('dynamic-builder').style.display = 'block';
            document.getElementById('form16-builder').style.display = 'none';
            document.getElementById('filter-month-container').style.display = 'none';
            document.getElementById('filter-year-container').style.display = 'none';
            document.getElementById('filter-emp-container').style.display = 'none';
        } else if (id === 'form16') {
            document.getElementById('report-table').style.display = 'none';
            document.getElementById('report-actions').style.display = 'none';
            document.getElementById('dynamic-builder').style.display = 'none';
            document.getElementById('form16-builder').style.display = 'block';
            document.getElementById('filter-month-container').style.display = 'none';
            document.getElementById('filter-year-container').style.display = 'none';
            document.getElementById('filter-emp-container').style.display = 'none';
            await initForm16Builder();
        } else {
            document.getElementById('report-table').style.display = 'table';
            document.getElementById('report-actions').style.display = 'flex';
            document.getElementById('dynamic-builder').style.display = 'none';
            document.getElementById('form16-builder').style.display = 'none';

            // Filters Visibility Logic
            const showMonth = ['att_log', 'sal_sheet', 'pf_esi', 'bank_adv', 'tax_rep', 'dept_summary'].includes(id);
            const showYear = ['yearly_salary'].includes(id);
            // Most reports can be filtered by employee, except maybe dept summary
            const showEmp = ['att_log', 'sal_sheet', 'pf_esi', 'bank_adv', 'tax_rep', 'yearly_salary', 'emp_master'].includes(id);

            document.getElementById('filter-month-container').style.display = showMonth ? 'block' : 'none';
            document.getElementById('filter-year-container').style.display = showYear ? 'block' : 'none';
            document.getElementById('filter-emp-container').style.display = showEmp ? 'block' : 'none';

            // Populate Emp Dropdown if empty and needed
            // Populate Emp Data if needed
            if (showEmp && allEmployeesForFilter.length === 0) {
                try {
                    const res = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 1000 });
                    if (res && res.employees) {
                        allEmployeesForFilter = res.employees.filter(e => e.status === 'Active');
                    }
                } catch (e) { console.error("Err loading emps", e); }
            }

            // Reset filter visually
            selectedEmpIds.clear();
            const btn = document.getElementById('btn-emp-filter');
            if (btn) btn.textContent = 'All Employees';

            loadReportData();
        }
    };

    window.initForm16Builder = async () => {
        try {
            if (allEmployeesForFilter.length === 0) {
                const res = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 1000 });
                if (res && res.employees) allEmployeesForFilter = res.employees.filter(e => e.status === 'Active');
            }
            const empSel = document.getElementById('f16-emp');
            empSel.innerHTML = allEmployeesForFilter.map(e => `<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} (${escapeHtml(e.employee_code) || e.id})</option>`).join('');

            const fySel = document.getElementById('f16-fy');
            const now = new Date();
            const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
            const years = [];
            for (let y = currentFyStart; y >= currentFyStart - 4; y--) years.push(`${y}-${y + 1}`);
            fySel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        } catch (e) { console.error('Form16 init error', e); }
    };

    window.generateForm16 = async () => {
        const employeeId = parseInt(document.getElementById('f16-emp').value);
        const financialYear = document.getElementById('f16-fy').value;
        if (!employeeId || !financialYear) { window.showToast('Select an employee and financial year', 'warning'); return; }

        try {
            const data = await window.electronAPI.getForm16Data({ employeeId, financialYear });
            if (data.monthsCovered === 0) { window.showToast(`No payroll records found for FY ${financialYear}.`, 'info'); return; }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            const emp = data.employee;
            const t = data.totals;
            let y = 50;

            doc.setFontSize(16); doc.text('FORM 16', 297, y, { align: 'center' }); y += 20;
            doc.setFontSize(10); doc.text('Certificate of Salary Paid & Tax Deducted at Source', 297, y, { align: 'center' }); y += 30;

            doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Part A — Employer & Employee Details', 40, y); y += 18;
            doc.setFont(undefined, 'normal'); doc.setFontSize(10);
            const line = (label, val) => { doc.text(`${label}:`, 40, y); doc.text(String(val || '-'), 220, y); y += 16; };
            line('Employer Name', emp.company_name);
            line('Employer PAN', emp.company_pan);
            line('Employer TAN', emp.company_tan);
            line('Employee Name', `${emp.first_name} ${emp.last_name}`);
            line('Employee PAN', emp.pan_number);
            line('Designation', emp.position_title);
            line('Financial Year', financialYear);
            line('Months Covered', data.monthsCovered);
            y += 10;

            doc.setFont(undefined, 'bold'); doc.setFontSize(11); doc.text('Part B — Salary Breakup & Tax Deducted', 40, y); y += 18;
            doc.setFont(undefined, 'normal'); doc.setFontSize(10);
            const amt = (label, val) => { doc.text(label, 40, y); doc.text('Rs. ' + Number(val || 0).toLocaleString(), 300, y, { align: 'right' }); y += 16; };
            amt('Basic Salary', t.basic);
            amt('Dearness Allowance', t.da);
            amt('House Rent Allowance', t.hra);
            amt('Conveyance Allowance', t.conveyance);
            amt('Medical Allowance', t.medical);
            amt('Special Allowance', t.special);
            amt('Bonuses', t.bonuses);
            doc.setFont(undefined, 'bold'); amt('Gross Salary', t.gross); doc.setFont(undefined, 'normal');
            y += 6;
            amt('Provident Fund (u/s 80C)', t.employeePf);
            amt('Voluntary PF (u/s 80C)', t.vpf);
            amt('Professional Tax', t.professionalTax);
            doc.setFont(undefined, 'bold'); amt('Total Tax Deducted at Source (TDS)', t.tds); doc.setFont(undefined, 'normal');
            y += 6;
            doc.setFont(undefined, 'bold'); doc.setFontSize(11); amt('Net Salary Paid', t.netPaid);

            y += 30;
            doc.setFontSize(8); doc.setFont(undefined, 'normal');
            doc.text('This is a system-generated certificate based on payroll records and is not a substitute for the statutory', 40, y); y += 12;
            doc.text('Form 16 filed with the Income Tax Department. Verify figures before use for tax filing purposes.', 40, y);

            doc.save(`Form16_${emp.first_name}_${emp.last_name}_${financialYear}.pdf`);
        } catch (e) {
            window.showToast('Form 16 generation failed: ' + e.message, 'error');
        }
    };

    window.loadReportData = async () => {
        if (!currentReportId) return;

        const tbody = document.getElementById('report-body');
        const thead = document.getElementById('report-header-row');
        tbody.innerHTML = '<tr><td colspan="100" style="text-align:center; padding:20px;">Loading Data...</td></tr>';

        // Context
        if (!contextCompany) {
            tbody.innerHTML = '<tr><td colspan="100" style="text-align:center; color:red;">Please select a Company first.</td></tr>';
            return;
        }

        const dateVal = document.getElementById('report-month').value;
        const yearVal = document.getElementById('report-year').value;

        // Determine effective Year/Month
        let year, month;
        if (currentReportId === 'yearly_salary') {
            year = yearVal;
            month = null; // Full year
        } else {
            [year, month] = dateVal.split('-');
        }

        try {
            let cols = [];
            currentData = [];

            if (currentReportId === 'emp_master') {
                const res = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 10000 });
                currentData = res.employees.filter(e => e.status === 'Active');
                // Client side filter
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.id));

                cols = [
                    { k: 'id', l: 'System ID' },
                    { k: 'employee_code', l: 'Emp Code', v: r => escapeHtml(r.employee_code) || `EMP${r.id}` },
                    { k: 'name', l: 'Full Name', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'first_name', l: 'First Name' },
                    { k: 'last_name', l: 'Last Name' },
                    { k: 'gender', l: 'Gender' },
                    { k: 'dob', l: 'Date of Birth' },
                    { k: 'father_name', l: 'Father Name' },
                    { k: 'blood_group', l: 'Blood Group' },

                    // Contact
                    { k: 'email', l: 'Email' },
                    { k: 'phone', l: 'Phone' },
                    { k: 'emergency_contact_name', l: 'Emergency Contact' },
                    { k: 'emergency_contact_phone', l: 'Emergency Phone' },

                    // Work
                    { k: 'company_name', l: 'Company' },
                    { k: 'branch_name', l: 'Branch' },
                    { k: 'department_name', l: 'Department' },
                    { k: 'position_title', l: 'Designation' },
                    { k: 'date_of_joining', l: 'Date of Joining' },
                    { k: 'status', l: 'Status' },
                    { k: 'exit_date', l: 'Exit Date' },

                    // Address
                    { k: 'address', l: 'Address' },
                    { k: 'city', l: 'City' },
                    { k: 'state', l: 'State' },
                    { k: 'zip_code', l: 'Zip Code' },

                    // Bank
                    { k: 'bank_name', l: 'Bank Name' },
                    { k: 'account_number', l: 'Account No' },
                    { k: 'ifsc_code', l: 'IFSC Code' },
                    { k: 'payment_mode', l: 'Payment Mode' },

                    // Statutory
                    { k: 'pan_number', l: 'PAN' },
                    { k: 'aadhaar_number', l: 'Aadhaar' },
                    { k: 'uan', l: 'UAN' },
                    { k: 'pf_number', l: 'PF Number' },
                    { k: 'esi_number', l: 'ESI Number' },

                    // Salary
                    { k: 'base_salary', l: 'Base Salary', v: r => (r.base_salary || 0).toLocaleString() },
                    { k: 'pf_rate', l: 'PF Rate (%)' },
                    { k: 'esi_rate', l: 'ESI Rate (%)' },
                    { k: 'da_rate', l: 'DA Rate' },
                    { k: 'hra_rate', l: 'HRA Rate' },
                    { k: 'conveyance_allowance', l: 'Conveyance' },
                    { k: 'medical_allowance', l: 'Medical' },
                    { k: 'special_allowance_fixed', l: 'Spl Allow Fixed' }
                ];
            }
            else if (currentReportId === 'att_log') {
                const daysInMonth = new Date(year, month, 0).getDate();
                const startDate = year + '-' + month + '-01'; // Fixed string construction
                const endDate = year + '-' + month + '-' + daysInMonth; // Fixed string construction

                // Fetch Data (High Limits for Report)
                const resEmp = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 100000 });
                const resAtt = await window.electronAPI.getAttendance({ companyId: contextCompany, startDate, endDate, limit: 1000000 });

                // Pivot
                const attMap = {};
                resAtt.data.forEach(a => {
                    if (!attMap[a.employee_id]) attMap[a.employee_id] = {};
                    attMap[a.employee_id][new Date(a.date).getDate()] = a.status;
                });

                let employees = resEmp.employees.filter(e => e.status === 'Active');
                if (selectedEmpIds.size > 0) employees = employees.filter(e => selectedEmpIds.has(e.id));

                currentData = employees.map(e => {
                    const row = { code: `EMP${e.id}`, name: `${e.first_name} ${e.last_name}` };
                    // Fill days
                    let present = 0;
                    for (let d = 1; d <= daysInMonth; d++) {
                        const status = attMap[e.id]?.[d] || '-';
                        // Shorten status codes
                        let code = '-';
                        if (status === 'Present') code = 'P';
                        else if (status === 'Absent') code = 'A';
                        else if (status === 'Weekly Off') code = 'WO';
                        else if (status === 'Half Day') code = 'HD';
                        else if (status === 'Leave') code = 'L';
                        else code = status.substring(0, 1);

                        row[`d${d}`] = code;
                        if (['P', 'WO', 'HD', 'L'].includes(code)) present++;
                    }
                    row['total_p'] = present;
                    return row;
                });

                cols = [
                    { k: 'code', l: 'Code' },
                    { k: 'name', l: 'Name' },
                    ...Array.from({ length: daysInMonth }, (_, i) => ({ k: `d${i + 1}`, l: `${i + 1}` })),
                    { k: 'total_p', l: 'Paid Days' }
                ];
            }
            else if (currentReportId === 'sal_sheet') {
                const rows = await window.electronAPI.getPayrollReport({ type: 'sal_sheet', year, month: parseInt(month), companyId: contextCompany });

                currentData = rows || [];
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.employee_id));

                cols = [
                    { k: 'name', l: 'Employee', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'department_name', l: 'Dept' },
                    { k: 'pay_days', l: 'Days' },
                    { k: 'basic_salary', l: 'Basic' },
                    { k: 'hra', l: 'HRA' },
                    { k: 'special_allowance', l: 'Spl' },
                    { k: 'gross_salary', l: 'Gross' },
                    { k: 'employee_pf', l: 'PF' },
                    { k: 'professional_tax', l: 'PT' },
                    { k: 'tds', l: 'TDS' },
                    { k: 'net_salary', l: 'Net Pay', v: r => `<b>${r.net_salary}</b>` }
                ];
            }
            else if (currentReportId === 'pf_esi') {
                const rows = await window.electronAPI.getPayrollReport({ type: 'pf_esi', year, month: parseInt(month), companyId: contextCompany });
                currentData = rows || [];
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.employee_id));

                cols = [
                    { k: 'name', l: 'Employee', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'uan', l: 'UAN No', v: r => escapeHtml(r.uan) || '-' },
                    { k: 'gross_salary', l: 'Gross Wages' },
                    { k: 'basic_salary', l: 'PF Wages' },
                    { k: 'employee_pf', l: 'PF (Emp)' },
                    { k: 'employer_pf', l: 'PF (Emplr)' },
                    { k: 'employee_esi', l: 'ESI (Emp)' },
                    { k: 'employer_esi', l: 'ESI (Emplr)' }
                ];
            }
            else if (currentReportId === 'bank_adv') {
                const rows = await window.electronAPI.getPayrollReport({ type: 'bank_adv', year, month: parseInt(month), companyId: contextCompany });
                currentData = rows || [];
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.employee_id));

                cols = [
                    { k: 'name', l: 'Beneficiary Name', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'account_number', l: 'Account No', v: r => escapeHtml(r.account_number) || 'Missing' },
                    { k: 'ifsc_code', l: 'IFSC', v: r => escapeHtml(r.ifsc_code) || '-' },
                    { k: 'bank_name', l: 'Bank' },
                    { k: 'net_salary', l: 'Amount', v: r => parseFloat(r.net_salary).toFixed(2) },
                    { k: 'remarks', l: 'Narration', v: r => `Sal ${month}/${year}` }
                ];
            }
            else if (currentReportId === 'tax_rep') {
                const rows = await window.electronAPI.getPayrollReport({ type: 'tax_rep', year, month: parseInt(month), companyId: contextCompany });
                currentData = rows || [];
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.employee_id));

                cols = [
                    { k: 'name', l: 'Employee', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'pan_number', l: 'PAN' },
                    { k: 'gross_salary', l: 'Gross Income' },
                    { k: 'professional_tax', l: 'PT Ded' },
                    { k: 'tds', l: 'TDS Ded' },
                    { k: 'net_salary', l: 'Net Payout' }
                ];
            }
            else if (currentReportId === 'yearly_salary') {
                // Must use Year filter
                const rows = await window.electronAPI.getPayrollReport({ type: 'yearly_salary', year: yearVal, companyId: contextCompany });
                currentData = rows || [];
                if (selectedEmpIds.size > 0) currentData = currentData.filter(e => selectedEmpIds.has(e.employee_id));

                cols = [
                    { k: 'name', l: 'Employee', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                    { k: 'gross_salary', l: 'Total Gross' },
                    { k: 'basic_salary', l: 'Total Basic' },
                    { k: 'employee_pf', l: 'Total PF' },
                    { k: 'professional_tax', l: 'Total PT' },
                    { k: 'tds', l: 'Total TDS' },
                    { k: 'net_salary', l: 'Net Payout', v: r => `<b>${(r.net_salary || 0).toLocaleString()}</b>` }
                ];
            }
            else if (currentReportId === 'dept_summary') {
                const rows = await window.electronAPI.getPayrollReport({ type: 'dept_summary', year, month: parseInt(month), companyId: contextCompany });
                currentData = rows || [];
                cols = [
                    { k: 'department_name', l: 'Department', v: r => escapeHtml(r.department_name) || 'No Dept' },
                    { k: 'emp_count', l: 'Total Employees' },
                    { k: 'gross_salary', l: 'Total Gross Cost' },
                    { k: 'employer_pf', l: 'PF Cost (Emplr)' },
                    { k: 'net_salary', l: 'Net Disbursed', v: r => `<b>${(r.net_salary || 0).toLocaleString()}</b>` }
                ];
            }

            // Render Header
            thead.innerHTML = cols.map(c => `<th style="width:${c.w || 'auto'}">${c.l}</th>`).join('');

            // Render Body
            if (currentData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; padding:20px;">No records found.</td></tr>`;
            } else {
                tbody.innerHTML = currentData.map(row => `
                    <tr>
                        ${cols.map(c => `<td>${c.v ? c.v(row) : (row[c.k] !== undefined && row[c.k] !== null ? escapeHtml(row[c.k]) : '-')}</td>`).join('')}
                    </tr>
                `).join('');
            }

            // Store cols for export
            window.currentReportCols = cols;

        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="100" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
        }
    };

    window.closeExportModal = () => document.getElementById('export-modal').classList.remove('active');

    // Renamed to be more generic settings opener
    window.openReportSettings = () => {
        if (!currentData || currentData.length === 0) { alert("No data to configure"); return; }

        // Populate Modal
        const list = document.getElementById('export-cols-list');
        list.innerHTML = window.currentReportCols.map((c, i) => `
            <label class="col-checkbox-label">
                <input type="checkbox" name="report_col" value="${i}" ${c.hidden ? '' : 'checked'}> 
                <span>${c.l}</span>
            </label>
        `).join('');

        document.getElementById('export-modal').classList.add('active');
    };

    window.toggleAllReportCols = (select) => {
        document.querySelectorAll('input[name="report_col"]').forEach(cb => cb.checked = select);
    };

    // Apply to View (Local Filter)
    window.applyReportViewColumns = () => {
        const checkedIndices = new Set(Array.from(document.querySelectorAll('input[name="report_col"]:checked')).map(cb => parseInt(cb.value)));

        // Update model visibility
        window.currentReportCols.forEach((c, i) => {
            c.hidden = !checkedIndices.has(i);
        });

        // Re-render Header
        const thead = document.getElementById('report-header-row');
        thead.innerHTML = window.currentReportCols.filter(c => !c.hidden).map(c => `<th style="width:${c.w || 'auto'}">${c.l}</th>`).join('');

        // Re-render Body
        const tbody = document.getElementById('report-body');
        if (currentData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="100" style="text-align:center; padding:20px;">No records found.</td></tr>`;
        } else {
            tbody.innerHTML = currentData.map(row => `
                <tr>
                    ${window.currentReportCols.filter(c => !c.hidden).map(c => `
                        <td>${c.v ? c.v(row) : (row[c.k] !== undefined && row[c.k] !== null ? escapeHtml(row[c.k]) : '-')}</td>
                    `).join('')}
                </tr>
            `).join('');
        }

        window.closeExportModal();
    };

    // Export Functionality
    window.confirmExport = () => {
        // Collect SELECTED columns from the modal, distinct from View if user just clicked checks but didn't apply to view yet
        // Actually, let's use the checks currently in the modal
        const checkedIndices = Array.from(document.querySelectorAll('input[name="report_col"]:checked')).map(cb => parseInt(cb.value));
        if (checkedIndices.length === 0) { alert("Select at least one column"); return; }

        const selectedCols = checkedIndices.map(i => window.currentReportCols[i]);

        let csv = selectedCols.map(c => c.l).join(',') + "\n";
        currentData.forEach(row => {
            csv += selectedCols.map(c => {
                let val = c.v ? c.v(row) : (row[c.k] || '');
                val = String(val).replace(/"/g, '""').replace(/<[^>]*>/g, ''); // Strip HTML if any
                return `"${val}"`;
            }).join(',') + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentReportId}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        window.closeExportModal();
    };

    // --- Dynamic Builder Functions ---
    window.loadDynamicSchema = async () => {
        const source = document.getElementById('dyn-source').value;
        if (!source) return;

        // Show/Hide Date Filter
        const showDate = ['payroll', 'attendance'].includes(source);
        document.getElementById('dyn-filter-month').style.display = showDate ? 'block' : 'none';

        const schema = await window.electronAPI.invoke('get-schema-cols');
        const cols = schema[source] || [];

        const list = document.getElementById('dyn-cols-list');
        list.innerHTML = cols.map(c => `
            <label style="display:flex; align-items:center; gap:5px; font-size:13px; cursor:pointer;">
                <input type="checkbox" name="dyn_col" value="${c.id}"> ${c.label}
            </label>
        `).join('');

        window.toggleAllDynCols = (select) => {
            document.querySelectorAll('input[name="dyn_col"]').forEach(cb => cb.checked = select);
        };

        document.getElementById('dyn-cols-container').style.display = 'block';
        document.getElementById('dyn-actions').style.display = 'block';
    };

    window.generateDynamicReport = async () => {
        const table = document.getElementById('dyn-source').value;
        const checked = Array.from(document.querySelectorAll('input[name="dyn_col"]:checked')).map(c => c.value);

        if (checked.length === 0) { alert("Please select at least one column."); return; }

        const dateVal = document.getElementById('dyn-month').value;
        const [year, month] = dateVal.split('-');

        // Call API
        try {
            const res = await window.electronAPI.invoke('get-dynamic-report', {
                table,
                columns: checked,
                year,
                month: parseInt(month),
                companyId: contextCompany
            });

            // Switch to Table View
            document.getElementById('report-table').style.display = 'table';
            document.getElementById('report-actions').style.display = 'flex';

            currentReportId = 'dynamic';
            currentData = res;

            // Build Cols dynamically for render
            // Map checked IDs to Labels from schema? Or just use ID as key
            // We need labels. Let's cheat and use title case of ID
            const cols = [
                // Usually dynamic adds Name automatically if joined
                { k: 'first_name', l: 'First Name', v: r => `${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}` },
                ...checked.map(c => ({ k: c, l: c.toUpperCase().replace(/_/g, ' ') }))
            ];
            // Filter duplicates if any

            const tbody = document.getElementById('report-body');
            const thead = document.getElementById('report-header-row');

            thead.innerHTML = cols.map(c => `<th>${c.l}</th>`).join('');

            if (currentData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; padding:20px;">No records found.</td></tr>`;
            } else {
                tbody.innerHTML = currentData.map(row => `
                    <tr>
                        ${cols.map(c => `<td>${row[c.k] !== undefined ? escapeHtml(row[c.k]) : (c.v ? c.v(row) : '-')}</td>`).join('')}
                    </tr>
                `).join('');
            }

            window.currentReportCols = cols;

        } catch (e) {
            alert("Error generating report: " + e.message);
        }
    };

    // --- Employee Filter Logic ---
    window.openEmpFilterModal = () => {
        const modal = document.getElementById('emp-filter-modal');
        const list = document.getElementById('emp-filter-list');

        if (allEmployeesForFilter.length === 0) {
            list.innerHTML = '<div style="padding:10px; text-align:center;">No employees loaded. Try selecting a report first.</div>';
        } else {
            list.innerHTML = allEmployeesForFilter.map(e => `
                <label style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                    <input type="checkbox" name="emp_filter_chk" value="${e.id}" ${selectedEmpIds.size === 0 || selectedEmpIds.has(e.id) ? 'checked' : ''}>
                    <span>${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} <small style="color:#64748b;">(${escapeHtml(e.employee_code) || e.id})</small></span>
                </label>
            `).join('');
        }

        modal.classList.add('active');
    };

    window.toggleAllEmpFilter = (state) => {
        document.querySelectorAll('input[name="emp_filter_chk"]').forEach(cb => cb.checked = state);
    };

    window.applyEmpFilter = () => {
        const checkboxes = document.querySelectorAll('input[name="emp_filter_chk"]');
        const checked = Array.from(checkboxes).filter(c => c.checked).map(c => parseInt(c.value));

        selectedEmpIds.clear();
        const btn = document.getElementById('btn-emp-filter');

        if (checked.length === allEmployeesForFilter.length || checked.length === 0) {
            // All selected or none (implies all in some UX, or none)
            // Let's assume none checked means ALL for convenience, or strictly none?
            // Usually "All" is better default.
            if (checked.length === 0 && checkboxes.length > 0) {
                // If user deselected all, maybe they want to see none? 
                // But usually empty filter means "No Filter".
                // Let's treat it as No Filter (All).
                btn.textContent = 'All Employees';
            } else {
                btn.textContent = 'All Employees';
            }
        } else {
            checked.forEach(id => selectedEmpIds.add(id));
            btn.textContent = `${checked.length} Employee${checked.length !== 1 ? 's' : ''} Selected`;
        }

        loadReportData();
        document.getElementById('emp-filter-modal').classList.remove('active');
    };
}
