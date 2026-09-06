import { escapeHtml } from './utils.js';

export async function loadPayroll() {
    const contentArea = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Context from Ribbon
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;
    const contextYear = document.getElementById('ctx-year')?.value || '2025-2026';
    const contextMonth = document.getElementById('ctx-month')?.value || '4'; // Default April

    if (!contextCompany || contextCompany === 'Loading...') {
        contentArea.innerHTML = '<div style="padding:20px; text-align:center;"><h3>Please select a Company first.</h3></div>';
        return;
    }

    // Fetch Settings
    const settings = await window.electronAPI.getSettings();
    const startDaySetting = settings.find(s => s.key === 'payroll_month_start_day');
    const startDay = parseInt(startDaySetting ? startDaySetting.value : '1');

    // Parse Period
    const yearParts = contextYear.split('-');
    const m = parseInt(contextMonth);
    let actualYear = parseInt(yearParts[0]);
    if (m < 4) actualYear = parseInt(yearParts[1]);

    let startDate, endDate;
    const daysInContextMonth = new Date(actualYear, m, 0).getDate(); // Days in the month selected in context

    if (startDay === 1) {
        startDate = `${actualYear}-${String(m).padStart(2, '0')}-01`;
        endDate = `${actualYear}-${String(m).padStart(2, '0')}-${daysInContextMonth}`;
    } else {
        // e.g. Start Day 26. For Month 5 (May), period is April 26 to May 25.
        const prevMonth = m === 1 ? 12 : m - 1;
        const prevYear = m === 1 ? actualYear - 1 : actualYear;

        startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        endDate = `${actualYear}-${String(m).padStart(2, '0')}-${String(startDay - 1).padStart(2, '0')}`;
    }

    // Calculate total days in this period (usually 30 or 31, but depends on the range)
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const daysInMonth = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

    // State
    let payrollData = [];
    let filteredPayroll = [];
    let modifiedRecords = {};
    let allEmployeesCache = [];
    let currentSearch = '';
    let currentDeptId = 'all';
    let sortCol = 'sr';
    let sortDir = 1;

    const monthName = new Date(actualYear, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Styles for Single-Color Professional Look
    const HEAD_BG = '#1e3a8a'; // Deep Blue (Corporate)
    const HEAD_TEXT = '#ffffff';
    const SUB_HEAD_BG = '#3b82f6'; // Lighter Blue for Grouping (Optional, or just single header)

    // We will use a Single Header Row to match typical efficient ERP grids, or nested if complex. 
    // Reference image shows nested headers: [Income] [Deduction].
    // Let's implement that for professional look.

    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
            <div class="erp-toolbar" style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px;">
                <div>
                    <h2 style="margin:0; font-size:14px; color:#1e3a8a; font-weight:bold;">Salary Sheet: <span style="color:#000;">${monthName}</span></h2>
                </div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <!-- Search & Filter -->
                    <div class="search-box" style="background:white; border:1px solid #ccc; border-radius:2px; display:flex; align-items:center; padding:0 5px; height:24px;">
                        <i class="fas fa-search" style="color:#888; font-size:11px;"></i>
                        <input type="text" id="pay-search" placeholder="Search..." 
                               style="border:none; background:transparent; font-size:11px; padding:2px 5px; outline:none; width:120px;"
                               onkeyup="handlePayrollFilter()">
                    </div>
                    <select id="pay-filter-dept" onchange="handlePayrollFilter()" 
                            style="padding:2px 5px; border:1px solid #ccc; border-radius:2px; font-size:11px; background:white; height:24px;">
                        <option value="all">All Dept</option>
                    </select>

                    <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 2px;"></div>

                    <button class="erp-btn" onclick="exportPayrollExcel()"><i class="fas fa-file-excel"></i></button>
                    ${currentUser.role !== 'employee' ? `
                        <button class="erp-btn" onclick="refreshPayrollGrid(true)" style="color:#1e3a8a;"><i class="fas fa-sync-alt"></i></button>
                        <button class="erp-btn" onclick="savePayrollGrid()"><i class="fas fa-save"></i></button>
                        <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 2px;"></div>
                        <button class="erp-btn" onclick="calTdsPayroll()" title="Recalculate TDS for all rows"><i class="fas fa-calculator"></i></button>
                        <button class="erp-btn" onclick="transferTdsPayroll()" title="Mark TDS as transferred/remitted"><i class="fas fa-paper-plane"></i></button>
                        <button class="erp-btn" onclick="openChallanModal()" title="Generate statutory challan"><i class="fas fa-file-invoice"></i></button>
                        <button class="erp-btn" onclick="clearColumnValue()" title="Bulk-clear a column"><i class="fas fa-eraser"></i></button>
                    ` : ''}
                    <button class="erp-btn" onclick="exportPayslipsAll()" style="color:#dc2626;"><i class="fas fa-file-pdf"></i></button>
                    <button class="erp-btn" onclick="refreshPayrollGrid()"><i class="fas fa-sync"></i></button>
                </div>
            </div>

            <div style="flex:1; overflow:auto; position:relative; background:#fff;">
                <table class="data-table" style="border-collapse: collapse; width:100%; border:1px solid #cbd5e1;">
                    <thead style="position:sticky; top:0; z-index:10;">
                        <!-- Group Header -->
                        <tr style="background:${HEAD_BG}; color:white;">
                            <th colspan="4" style="border:1px solid #475569; padding:4px; text-align:center;">Employee Details</th>
                            <th colspan="3" style="border:1px solid #475569; padding:4px; text-align:center;">Income</th>
                            <th colspan="5" style="border:1px solid #475569; padding:4px; text-align:center;">Deductions</th>
                            <th colspan="2" style="border:1px solid #475569; padding:4px; text-align:center;">Net Pay</th>
                            <th rowspan="2" style="border:1px solid #475569; padding:4px; text-align:center;  width:80px;">Actions</th>
                        </tr>
                        <!-- Column Header -->
                        <tr style="background:${HEAD_BG}; color:white; font-size:12px;">
                            <th style="padding:6px; border:1px solid #475569; width:40px; cursor:pointer;" onclick="setPayrollSort('sr')">Sr</th>
                            <th style="padding:6px; border:1px solid #475569; text-align:left; cursor:pointer;" onclick="setPayrollSort('name')">Employee Name</th>
                             <th style="padding:6px; border:1px solid #475569; cursor:pointer;" onclick="setPayrollSort('dept')">Dept</th>
                            <th style="padding:6px; border:1px solid #475569; cursor:pointer;" onclick="setPayrollSort('package')">Package</th>
                            
                            <th style="padding:6px; border:1px solid #475569; width:60px; cursor:pointer;" onclick="setPayrollSort('payDays')">Pay Days</th>
                            <th style="padding:6px; border:1px solid #475569;">Basic</th>
                            <th style="padding:6px; border:1px solid #475569;">Gross Salary</th>
                            
                            <th style="padding:6px; border:1px solid #475569; width:70px;">TDS</th>
                            <th style="padding:6px; border:1px solid #475569; width:70px;">PF</th>
                            <th style="padding:6px; border:1px solid #475569; width:70px;">ESI</th>
                            <th style="padding:6px; border:1px solid #475569; width:70px;">PT</th>
                            <th style="padding:6px; border:1px solid #475569; width:70px;">Loan</th>
                            
                            <th style="padding:6px; border:1px solid #475569; cursor:pointer;" onclick="setPayrollSort('totalDed')">Total Ded.</th>
                            <th style="padding:6px; border:1px solid #475569; width:90px; cursor:pointer;" onclick="setPayrollSort('net')">Net Pay</th>
                        </tr>
                    </thead>
                    <tbody id="payroll-grid-body" style="font-size:13px;">
                        <tr><td colspan="14" style="text-align:center; padding:20px;">Loading Data...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div style="padding:5px 10px; background:#e2e8f0; border-top:1px solid #cbd5e1; font-size:13px; display:flex; justify-content:space-between; align-items:center;">
                <div><span id="unsaved-msg" style="color:#dc2626; font-weight:bold; display:none;">● Unsaved Changes</span></div>
                <div style="font-weight:bold; color:#1e3a8a;">
                    NET PAYABLE: <span id="total-net-display" style="font-size:15px; margin-left:5px;">0.00</span>
                </div>
            </div>
        </div>
    `;

    window.refreshPayrollGrid = async (forceRecalculate = false) => {
        const tbody = document.getElementById('payroll-grid-body');
        tbody.innerHTML = '<tr><td colspan="100" style="text-align:center; padding:20px;">Loading Data...</td></tr>';
        modifiedRecords = {};
        updateUnsavedIndicator();

        try {
            const empRes = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 1000 });
            const allEmployees = empRes.employees.filter(e => e.status === 'Active');

            if (allEmployees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="100" style="text-align:center;">No active employees found.</td></tr>';
                return;
            }

            const payrollRes = await window.electronAPI.getPayroll({ year: actualYear, month: m, companyId: contextCompany, limit: 1000 });
            const existingPayroll = payrollRes.data || [];

            // Attendance for Defaults
            const attRes = await window.electronAPI.getAttendance({ companyId: contextCompany, startDate, endDate, limit: 10000 });
            const attStats = {};
            attRes.data.forEach(r => {
                if (!attStats[r.employee_id]) attStats[r.employee_id] = 0;
                if (r.status === 'Present' || r.status === 'P' || r.status === 'Weekly Off' || r.status === 'WO' || r.status === 'Leave' || r.status === 'L') {
                    attStats[r.employee_id] += 1;
                } else if (r.status === 'Half Day' || r.status === 'HD') {
                    attStats[r.employee_id] += 0.5;
                }
            });

            allEmployeesCache = allEmployees;

            // Active loan EMIs (batch fetch, used to populate the Loan deduction column)
            const allLoans = await window.electronAPI.getLoans().catch(() => []);
            const loanMap = {};
            (allLoans || []).forEach(l => {
                if (l.status === 'Active' && l.balance > 0) {
                    loanMap[l.employee_id] = (loanMap[l.employee_id] || 0) + (l.monthly_emi || 0);
                }
            });

            // Load Depts for filter
            const depts = await window.electronAPI.getDepartments();
            const dSel = document.getElementById('pay-filter-dept');
            if (dSel && dSel.options.length <= 1) {
                depts.forEach(d => dSel.innerHTML += `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`);
            }

            // Fetch PT Amount... (keep existing logic)
            let ptBase = 200;
            try {
                const ptSetting = settings.find(s => s.key === 'professional_tax');
                if (ptSetting) ptBase = parseFloat(ptSetting.value) || 200;
            } catch (e) { }

            payrollData = allEmployees.map((emp, index) => {
                const existing = existingPayroll.find(p => p.employee_id === emp.id);

                let payDays = daysInMonth;
                if (existing && existing.pay_days) payDays = existing.pay_days;
                else if (attStats[emp.id] !== undefined) payDays = attStats[emp.id];

                const monthlyBasic = emp.base_salary || 0;
                const monthlyDA = emp.da_rate || 0;
                const monthlyHRA = emp.hra_rate || 0;
                const monthlyConv = emp.conveyance_allowance || 0;
                const monthlyMed = emp.medical_allowance || 0;
                const monthlySpl = emp.special_allowance_fixed || 0;

                const packageMonthly = monthlyBasic + monthlyDA + monthlyHRA + monthlyConv + monthlyMed + monthlySpl;

                let basic, da, hra, conv, med, spl, gross, pf, esi, tds, pt, loan;

                if (existing && !forceRecalculate) {
                    basic = existing.basic_salary;
                    da = existing.da || 0;
                    hra = existing.hra || 0;
                    conv = existing.conveyance || 0;
                    med = existing.medical || 0;
                    spl = existing.special_allowance || 0;
                    gross = existing.gross_salary;
                    pf = existing.employee_pf || existing.pf;
                    esi = existing.employee_esi || existing.esi;
                    tds = existing.tds;
                    pt = existing.professional_tax !== undefined ? existing.professional_tax : (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false ? ptBase : 0);
                    loan = existing.loan_deduction || loanMap[emp.id] || 0;
                } else {
                    const attendanceFactor = payDays / daysInMonth;
                    basic = Math.round(monthlyBasic * attendanceFactor);
                    da = Math.round(monthlyDA * attendanceFactor);
                    hra = Math.round(monthlyHRA * attendanceFactor);
                    conv = Math.round(monthlyConv * attendanceFactor);
                    med = Math.round(monthlyMed * attendanceFactor);
                    spl = Math.round(monthlySpl * attendanceFactor);
                    gross = basic + da + hra + conv + med + spl;

                    pf = Math.round(basic * (emp.pf_rate ? emp.pf_rate / 100 : 0.12));
                    if (emp.is_pf_enabled === 0 || emp.is_pf_enabled === false) pf = 0;

                    esi = 0;
                    if ((emp.is_esi_enabled === 1 || emp.is_esi_enabled === true) && gross <= 21000) {
                        esi = Math.ceil(gross * 0.0075);
                    }
                    tds = 0;
                    pt = (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false) ? ptBase : 0;
                    loan = loanMap[emp.id] || 0;
                }

                return {
                    sr: index + 1, id: emp.id, name: `${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}`, dept: escapeHtml(emp.department_name) || '-',
                    code: `EMP${String(emp.id).padStart(3, '0')}`, package: packageMonthly,
                    payDays, basic, da, hra, conv, med, spl, gross, pf, esi, tds, pt, loan,
                    totalDed: pf + esi + tds + pt + loan, net: gross - (pf + esi + tds + pt + loan),
                    isNew: !existing
                };
            });

            handlePayrollFilter();
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="100" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
        }
    };

    window.handlePayrollFilter = () => {
        currentSearch = (document.getElementById('pay-search')?.value || '').toLowerCase();
        currentDeptId = document.getElementById('pay-filter-dept')?.value || 'all';

        filteredPayroll = payrollData.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(currentSearch) || r.code.toLowerCase().includes(currentSearch);
            const matchesDept = currentDeptId === 'all' || r.dept === currentDeptId;
            return matchesSearch && matchesDept;
        });

        // Apply Sort
        filteredPayroll.sort((a, b) => {
            let v1 = a[sortCol];
            let v2 = b[sortCol];
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            if (v1 < v2) return -1 * sortDir;
            if (v1 > v2) return 1 * sortDir;
            return 0;
        });

        renderGrid();
    };

    window.setPayrollSort = (col) => {
        if (sortCol === col) sortDir *= -1;
        else { sortCol = col; sortDir = 1; }
        handlePayrollFilter();
    };

    function renderGrid() {
        const tbody = document.getElementById('payroll-grid-body');
        let totalNet = 0;

        tbody.innerHTML = filteredPayroll.map((r, i) => {
            r.totalDed = r.pf + r.esi + r.tds + r.pt + r.loan;
            r.net = r.gross - r.totalDed;
            totalNet += r.net;
            const rowBg = i % 2 === 0 ? '#f8fafc' : '#ffffff';

            // Helper to generate input - No Colors, just clean text
            const input = (field, val, width = '100%') => `
                <input type="number" 
                    class="grid-input" 
                    disabled 
                    data-id="${r.id}" data-field="${field}" value="${val}" 
                    style="width:${width}; background:transparent; border:none; text-align:right; font-family:inherit; font-size:inherit; color:inherit; padding:0 4px;"
                    onchange="handlePayrollChange(this)"
                    onfocus="this.style.background='#e0f2fe'" onblur="this.style.background='transparent'"
                >
            `;

            // Cell Style
            const tdStyle = "border:1px solid #e2e8f0; padding:2px 4px;";
            const tdNum = tdStyle + "text-align:right;";

            return `
                <tr style="background:${rowBg}; color:#1e293b;">
                    <td style="${tdStyle} text-align:center;">${r.sr}</td>
                    <td style="${tdStyle} font-weight:500;">
                        ${r.name} <span style="color:#64748b; font-size:0.85em;">(${r.code})</span>
                    </td>
                    <td style="${tdStyle} color:#64748b;">${r.dept}</td>
                    <td style="${tdNum}">${r.package.toLocaleString()}</td>
                    
                    <td style="${tdStyle}">${input('payDays', r.payDays)}</td>
                    <td style="${tdStyle}">${input('basic', r.basic)}</td>
                    <td style="${tdStyle} font-weight:600;">${input('gross', r.gross)}</td>
                    
                    <td style="${tdStyle}">${input('tds', r.tds)}</td>
                    <td style="${tdStyle}">${input('pf', r.pf)}</td>
                    <td style="${tdStyle}">${input('esi', r.esi)}</td>
                    <td style="${tdStyle}">${input('pt', r.pt)}</td>
                    <td style="${tdStyle}">${input('loan', r.loan)}</td>
                    
                    <td style="${tdNum} font-weight:600;">${r.totalDed.toLocaleString()}</td>
                    <td style="${tdNum} font-weight:600; color:#1e40af; cursor:pointer; text-decoration:underline;" onclick="handleNetPayClick(${r.id})">
                        ₹ ${r.net.toFixed(2)}
                    </td>
                    <td style="${tdStyle} text-align:center;">
                        <div style="display:flex; justify-content:center; gap:8px;">
                            <i class="fas fa-file-pdf" style="color:#dc2626; cursor:pointer;" title="Download PDF" onclick="exportSingleRecord(${r.id}, 'pdf')"></i>
                            <i class="fas fa-file-word" style="color:#0d9488; cursor:pointer;" title="Download Word" onclick="exportSingleRecord(${r.id}, 'word')"></i>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('total-net-display').textContent = totalNet.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    }

    window.handlePayrollChange = (el) => {
        const id = parseInt(el.getAttribute('data-id'));
        const field = el.getAttribute('data-field');
        const val = parseFloat(el.value) || 0;
        const r = payrollData.find(x => x.id === id);
        if (!r) return;

        // Logic
        if (field === 'payDays') {
            r.payDays = val;
            const attendanceFactor = r.payDays / daysInMonth;

            // Recalculate based on original master proportions if possible
            // We store the original employee components in the payrollData object for this purpose
            const emp = allEmployeesCache.find(e => e.id === id);
            if (emp) {
                const monthlyBasic = emp.base_salary || 0;
                const monthlyDA = emp.da_rate || 0;
                const monthlyHRA = emp.hra_rate || 0;
                const monthlyConv = emp.conveyance_allowance || 0;
                const monthlyMed = emp.medical_allowance || 0;
                const monthlySpl = emp.special_allowance_fixed || 0;

                r.basic = Math.round(monthlyBasic * attendanceFactor);
                r.da = Math.round(monthlyDA * attendanceFactor);
                r.hra = Math.round(monthlyHRA * attendanceFactor);
                r.conv = Math.round(monthlyConv * attendanceFactor);
                r.med = Math.round(monthlyMed * attendanceFactor);
                r.spl = Math.round(monthlySpl * attendanceFactor);
                r.gross = r.basic + r.da + r.hra + r.conv + r.med + r.spl;
                r.lop = Math.round((r.package / daysInMonth) * (daysInMonth - val));

                r.pf = Math.round(r.basic * (emp.pf_rate ? emp.pf_rate / 100 : 0.12));
                if (emp.is_pf_enabled === 0 || emp.is_pf_enabled === false) r.pf = 0;

                r.esi = 0;
                if ((emp.is_esi_enabled === 1 || emp.is_esi_enabled === true) && r.gross <= 21000) {
                    r.esi = Math.ceil(r.gross * 0.0075);
                }
            } else {
                // Fallback to old behavior if emp cache is lost
                const earning = Math.round((r.package / daysInMonth) * r.payDays);
                r.basic = Math.round(earning * 0.5);
                r.hra = Math.round(earning * 0.4);
                r.spl = earning - r.basic - r.hra;
                r.da = 0; r.conv = 0; r.med = 0;
                r.gross = earning;
                r.lop = Math.round((r.package / daysInMonth) * (daysInMonth - r.payDays));
                r.pf = Math.round(r.basic * 0.12);
                r.esi = r.gross < 21000 ? Math.ceil(r.gross * 0.0075) : 0;
            }
            r.pt = (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false) ? 200 : 0;
        }
        else if (field === 'basic') {
            const diff = val - r.basic;
            r.basic = val;
            r.gross += diff;
            r.pf = Math.round(r.basic * 0.12);
        }
        else if (field === 'gross') {
            r.gross = val;
            r.esi = r.gross < 21000 ? Math.ceil(r.gross * 0.0075) : 0;
        }
        else if (field === 'pf') r.pf = val;
        else if (field === 'esi') r.esi = val;
        else if (field === 'tds') r.tds = val;
        else if (field === 'pt') r.pt = val;
        else if (field === 'loan') r.loan = val;

        renderGrid();
        modifiedRecords[id] = r;
        updateUnsavedIndicator();

        // Refocus hack
        setTimeout(() => {
            const nextInput = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
            if (nextInput) { nextInput.focus(); }
        }, 10);
    };

    window.mapGridRecordToPayslip = (id) => {
        const r = payrollData.find(x => x.id === id);
        const emp = allEmployeesCache.find(e => e.id === id);
        if (!r || !emp) return null;

        return {
            ...emp,
            company_name: window.state?.companyName || "Company Name",
            pay_period_start: startDate,
            pay_period_end: endDate,
            basic_salary: r.basic,
            hra: r.hra,
            da: r.da,
            conveyance: r.conv,
            medical: r.med,
            special_allowance: r.spl,
            gross_salary: r.gross,
            pf: r.pf,
            employee_pf: r.pf,
            pt: r.pt,
            professional_tax: r.pt,
            esi: r.esi,
            employee_esi: r.esi,
            tds: r.tds,
            lop_amount: r.lop || 0,
            lop_days: daysInMonth - r.payDays,
            days_present: r.payDays,
            total_deductions: r.totalDed,
            net_salary: r.net,
            status: 'Paid'
        };
    };

    window.handleNetPayClick = (id) => {
        const r = payrollData.find(x => x.id === id);
        if (!r) return;
        if (r.isNew) {
            alert("Please save the payroll sheet first before viewing the payslip.");
            return;
        }

        const record = window.mapGridRecordToPayslip(id);
        if (!record) return;

        if (window.openPayslipPreview) {
            window.openPayslipPreview(record);
        } else {
            alert("Payslip module not loaded. Please visit Payslips page once.");
        }
    };

    window.exportSingleRecord = (id, type) => {
        const r = payrollData.find(x => x.id === id);
        if (!r) return;
        if (r.isNew) {
            alert("Please save the payroll sheet first.");
            return;
        }

        const record = window.mapGridRecordToPayslip(id);
        if (!record) return;

        if (type === 'pdf') {
            if (window.exportPayslipPDF) window.exportPayslipPDF(record);
            else alert("PDF Export module not loaded.");
        } else {
            if (window.exportPayslipWord) window.exportPayslipWord(record);
            else alert("Word Export module not loaded.");
        }
    };

    window.updateUnsavedIndicator = () => {
        const count = Object.keys(modifiedRecords).length;
        document.getElementById('unsaved-msg').style.display = count > 0 ? 'inline-block' : 'none';
    };

    window.savePayrollGrid = async () => {
        const records = payrollData.map(r => ({
            employee_id: r.id,
            pay_period_start: startDate,
            pay_period_end: endDate,
            base_salary: r.package,
            basic_salary: r.basic,
            gross_salary: r.gross,
            pf: r.pf,
            esi: r.esi,
            tds: r.tds,
            professional_tax: r.pt,
            total_deductions: r.totalDed,
            net_salary: r.net,
            status: 'Paid',
            payment_date: new Date().toISOString().split('T')[0]
        }));

        try {
            let count = 0;
            for (const rec of payrollData.map(r => ({
                id: r.id,
                startDate, endDate, package: r.package,
                basic: r.basic, da: r.da, hra: r.hra, conv: r.conv, med: r.med, spl: r.spl,
                gross: r.gross, pf: r.pf, esi: r.esi, pt: r.pt, tds: r.tds, lop: r.lop,
                loan: r.loan || 0, totalDed: r.totalDed, net: r.net
            }))) {
                await window.electronAPI.runSQL(`
                    INSERT INTO payroll (
                        employee_id, pay_period_start, pay_period_end, base_salary,
                        basic_salary, da, hra, conveyance, medical, special_allowance,
                        gross_salary, employee_pf, pf, employee_esi, esi, professional_tax, tds, lop_amount, loan_deduction, total_deductions, net_salary, status
                    )
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Paid')
                    ON CONFLICT(employee_id, pay_period_start, pay_period_end)
                    DO UPDATE SET
                        basic_salary=excluded.basic_salary, da=excluded.da, hra=excluded.hra, conveyance=excluded.conveyance, medical=excluded.medical, special_allowance=excluded.special_allowance,
                        gross_salary=excluded.gross_salary, employee_pf=excluded.employee_pf, pf=excluded.pf, employee_esi=excluded.employee_esi, esi=excluded.esi, professional_tax=excluded.professional_tax, tds=excluded.tds, lop_amount=excluded.lop_amount, loan_deduction=excluded.loan_deduction, total_deductions=excluded.total_deductions, net_salary=excluded.net_salary
                `, [
                    rec.id, rec.startDate, rec.endDate, rec.package,
                    rec.basic, rec.da, rec.hra, rec.conv, rec.med, rec.spl,
                    rec.gross, rec.pf, rec.pf, rec.esi, rec.esi, rec.pt, rec.tds, rec.lop, rec.loan, rec.totalDed, rec.net
                ]);
                count++;
            }
            alert("Saved successfully!");
            modifiedRecords = {};
            updateUnsavedIndicator();
        } catch (e) {
            alert("Save failed: " + e.message);
        }
    };

    // --- CompuPay-parity toolbar actions ---
    window.calTdsPayroll = () => {
        const taxSlab1 = 50000, taxSlab2 = 100000;
        payrollData.forEach(r => {
            const earnings = (r.basic || 0) + (r.da || 0) + (r.hra || 0) + (r.conv || 0) + (r.med || 0) + (r.spl || 0);
            let tds = 0;
            if (earnings > taxSlab2) tds = Math.round(earnings * 0.1);
            else if (earnings > taxSlab1) tds = Math.round(earnings * 0.05);
            r.tds = tds;
            r.totalDed = (r.pf || 0) + (r.esi || 0) + tds + (r.pt || 0) + (r.loan || 0);
            r.net = r.gross - r.totalDed;
            modifiedRecords[r.id] = true;
        });
        updateUnsavedIndicator();
        handlePayrollFilter();
        window.showToast(`TDS recalculated for ${payrollData.length} employee(s). Click Save to persist.`, 'success');
    };

    window.transferTdsPayroll = async () => {
        const withTds = payrollData.filter(r => (r.tds || 0) > 0 && !r.isNew);
        if (withTds.length === 0) { window.showToast('No saved payroll rows with TDS to transfer.', 'info'); return; }
        const ok = window.confirmDialog ? await window.confirmDialog(`Mark TDS as transferred/remitted for ${withTds.length} employee(s)?`) : confirm('Mark TDS as transferred?');
        if (!ok) return;
        try {
            for (const r of withTds) {
                await window.electronAPI.runSQL(
                    "UPDATE payroll SET tds_transferred=1 WHERE employee_id=? AND pay_period_start=? AND pay_period_end=?",
                    [r.id, startDate, endDate]
                );
            }
            window.showToast('TDS marked as transferred.', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };

    window.openChallanModal = () => {
        const totalPf = payrollData.reduce((s, r) => s + (r.pf || 0), 0);
        const totalEsi = payrollData.reduce((s, r) => s + (r.esi || 0), 0);
        const totalTds = payrollData.reduce((s, r) => s + (r.tds || 0), 0);
        const totalPt = payrollData.reduce((s, r) => s + (r.pt || 0), 0);
        const companyName = window.state?.companyName || 'Company';

        const html = `
            <div id="challan-modal" class="erp-modal-overlay active">
                <div class="erp-modal-window" style="width:420px;">
                    <div class="erp-modal-header"><span>Statutory Challan — ${monthName}</span><span class="erp-modal-close" onclick="document.getElementById('challan-modal').remove()">&times;</span></div>
                    <div class="erp-modal-body">
                        <div style="font-weight:600; margin-bottom:10px;">${escapeHtml(companyName)}</div>
                        <table class="erp-table" style="width:100%;">
                            <tr><td>PF (Employee)</td><td style="text-align:right;">₹${totalPf.toLocaleString()}</td></tr>
                            <tr><td>ESI (Employee)</td><td style="text-align:right;">₹${totalEsi.toLocaleString()}</td></tr>
                            <tr><td>Professional Tax</td><td style="text-align:right;">₹${totalPt.toLocaleString()}</td></tr>
                            <tr><td>TDS</td><td style="text-align:right;">₹${totalTds.toLocaleString()}</td></tr>
                        </table>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="btn-gray" onclick="document.getElementById('challan-modal').remove()">Close</button>
                        <button class="btn-blue" onclick="downloadChallanPdf(${totalPf},${totalEsi},${totalPt},${totalTds})">Download PDF</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.downloadChallanPdf = (pf, esi, pt, tds) => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            const companyName = window.state?.companyName || 'Company';
            doc.setFontSize(14); doc.text(`${companyName} — Statutory Challan Summary`, 40, 50);
            doc.setFontSize(11); doc.text(`Period: ${monthName}`, 40, 75);
            doc.setFontSize(11);
            let y = 110;
            [['PF (Employee)', pf], ['ESI (Employee)', esi], ['Professional Tax', pt], ['TDS', tds]].forEach(([label, val]) => {
                doc.text(label, 40, y);
                doc.text(`Rs. ${Number(val).toLocaleString()}`, 300, y);
                y += 24;
            });
            doc.save(`Challan_${monthName.replace(/\s/g, '_')}.pdf`);
            document.getElementById('challan-modal')?.remove();
        } catch (e) { window.showToast('PDF generation failed: ' + e.message, 'error'); }
    };

    window.clearColumnValue = async () => {
        const html = `
            <div id="clear-col-modal" class="erp-modal-overlay active">
                <div class="erp-modal-window" style="width:360px;">
                    <div class="erp-modal-header"><span>Clear Column Value</span><span class="erp-modal-close" onclick="document.getElementById('clear-col-modal').remove()">&times;</span></div>
                    <div class="erp-modal-body">
                        <div class="form-row"><label class="form-label">Column</label>
                            <select id="clear-col-select" class="form-input">
                                <option value="tds">TDS</option>
                                <option value="pt">Professional Tax</option>
                                <option value="esi">ESI</option>
                                <option value="loan">Loan</option>
                            </select>
                        </div>
                        <p style="font-size:12px; color:#64748b;">Sets the selected column to 0 for every visible row. Click Save afterwards to persist.</p>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="btn-gray" onclick="document.getElementById('clear-col-modal').remove()">Cancel</button>
                        <button class="btn-blue" onclick="confirmClearColumn()">Clear</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.confirmClearColumn = () => {
        const col = document.getElementById('clear-col-select').value;
        payrollData.forEach(r => {
            r[col] = 0;
            r.totalDed = (r.pf || 0) + (r.esi || 0) + (r.tds || 0) + (r.pt || 0) + (r.loan || 0);
            r.net = r.gross - r.totalDed;
            modifiedRecords[r.id] = true;
        });
        document.getElementById('clear-col-modal')?.remove();
        updateUnsavedIndicator();
        handlePayrollFilter();
        window.showToast('Column cleared for all rows. Click Save to persist.', 'success');
    };

    window.exportPayrollExcel = () => {
        if (!payrollData || payrollData.length === 0) return alert("No data to export");

        const dataToExport = payrollData.map(r => ({
            'Sr': r.sr,
            'Code': r.code,
            'Employee Name': r.name,
            'Department': r.dept,
            'Package': r.package,
            'Pay Days': r.payDays,
            'Basic': r.basic,
            'DA': r.da || 0,
            'HRA': r.hra || 0,
            'Special Allowance': r.spl || 0,
            'Gross Salary': r.gross,
            'PF (Employee)': r.pf,
            'ESI (Employee)': r.esi,
            'PT': r.pt,
            'TDS': r.tds,
            'Loan': r.loan,
            'Total Deductions': r.totalDed,
            'Net Payable': r.net
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Salary_Sheet");
        XLSX.writeFile(wb, `SalarySheet_${monthName.replace(' ', '_')}.xlsx`);
    }

    // Implement Batch Printing
    window.exportPayslipsAll = () => {
        if (!payrollData || payrollData.length === 0) {
            alert("No payroll data to print.");
            return;
        }

        const hasUnsaved = Object.keys(modifiedRecords).length > 0 || payrollData.some(r => r.isNew);
        if (hasUnsaved) {
            alert("Please save the salary sheet before printing. Some records are unsaved.");
            return;
        }

        const records = payrollData.map(r => window.mapGridRecordToPayslip(r.id)).filter(x => x !== null);

        if (window.printAllPayslips) {
            // We need to inject the current data into the global context expected by payslips.js
            // Or better, let's just use what's available.
            // Actually window.printAllPayslips uses 'currentPayslipData' usually. 
            // We should ensure it can handle our mapped records.

            // Temporarily set the data for payslips.js
            const originalData = window.currentPayslipData;
            window.currentPayslipData = records;
            window.printAllPayslips();
            // Restore if needed, though usually not an issue
            // window.currentPayslipData = originalData;
        } else {
            alert("Bulk print module not loaded. Please visit Payslips page first.");
        }
    };

    refreshPayrollGrid();
}

export async function loadPayslips() {
    loadPayroll(); // Redirect to same view for now
}
