import { escapeHtml, escapeJsAttr } from './utils.js';

export async function loadAttendance() {
    const contentArea = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Context from Ribbon
    const ctxCompInput = document.getElementById('ctx-company');
    const contextCompany = window.state?.companyId || (ctxCompInput ? ctxCompInput.value : null);
    const contextYear = document.getElementById('ctx-year')?.value || new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString();
    const contextMonth = document.getElementById('ctx-month')?.value || (new Date().getMonth() + 1).toString();

    if (!contextCompany || contextCompany === 'Loading...' || contextCompany === '') {
        contentArea.innerHTML = '<div style="padding:20px; text-align:center; color:#666;"><h3>Please select a Company from the top bar first.</h3></div>';
        return;
    }

    // Parse Year/Month
    const yearParts = contextYear.split('-');
    const m = parseInt(contextMonth);
    let actualYear = parseInt(yearParts[0]);
    if (m < 4) actualYear = parseInt(yearParts[1]);

    const daysInMonth = new Date(actualYear, m, 0).getDate();
    const startDate = `${actualYear}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${actualYear}-${String(m).padStart(2, '0')}-${daysInMonth}`;

    let allEmployees = [];
    let attendanceData = [];
    let modifiedRecords = {};
    let currentSearch = '';
    let currentDeptId = 'all';
    let sortCol = 'first_name';
    let sortDir = 1; // 1: Asc, -1: Desc

    // HTML Structure with Modal
    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
            <div class="erp-toolbar" style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <h2 style="margin:0; font-size:14px; color:#333; font-weight:600;">Attendance <span style="font-size:11px; color:#666; font-weight:normal;">(${startDate} to ${endDate})</span></h2>
                    <div style="font-size:10px; display:flex; gap:5px; color:#555; align-items:center;">
                        <span class="badge success" style="padding:1px 4px;">P</span> Present
                        <span class="badge danger" style="padding:1px 4px;">A</span> Absent
                        <span class="badge warning" style="padding:1px 4px;">L</span> Leave
                        <span style="background:#f3f4f6; border:1px solid #ccc; padding:1px 4px; border-radius:2px;">WO</span> Weekly Off
                        <span style="background:#ffedd5; border:1px solid #f97316; padding:1px 4px; border-radius:2px; color:#c2410c;">HD</span> Half Day
                    </div>
                </div>
                <div id="att-pl-rh-counters" style="display:flex; gap:10px; font-size:11px; font-weight:600; color:#475569;"></div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <!-- Search & Filter Area -->
                    <div class="search-box" style="background:white; border:1px solid #ccc; border-radius:2px; display:flex; align-items:center; padding:0 5px; height:24px;">
                        <i class="fas fa-search" style="color:#888; font-size:11px;"></i>
                        <input type="text" id="att-search" placeholder="Search..." 
                               style="border:none; background:transparent; font-size:11px; padding:2px 5px; outline:none; width:120px;"
                               onkeyup="handleAttFilter()">
                    </div>
                    <select id="att-filter-dept" onchange="handleAttFilter()" 
                            style="padding:2px 5px; border:1px solid #ccc; border-radius:2px; font-size:11px; background:white; height:24px;">
                        <option value="all">All Dept</option>
                    </select>

                    <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 2px;"></div>

                    <button class="erp-btn" onclick="exportAttendanceExcel()" title="Export Excel"><i class="fas fa-file-export"></i> XLS</button>
                    <button class="erp-btn" onclick="downloadAttendanceTemplate()" title="Download Template"><i class="fas fa-download"></i> Tpl</button>
                    <button class="erp-btn" onclick="triggerAttImport()" title="Import Excel"><i class="fas fa-file-import"></i> Imp</button>
                    
                    <div class="toolbar-divider" style="width:1px; background:#ccc; height:20px; margin:0 2px;"></div>

                    <button class="erp-btn" onclick="creditLeaves()"><i class="fas fa-coins"></i></button>
                    <button class="erp-btn" onclick="autoFillAttendance()"><i class="fas fa-magic"></i></button>
                    <button class="erp-btn" onclick="openMarkMultipleModal()" title="Mark Multiple Employees" style="white-space:nowrap;"><i class="fas fa-users-cog"></i></button>
                    <button class="erp-btn" onclick="saveMonthlyAttendance()" ><i class="fas fa-save"></i></button>
                    <button class="erp-btn" onclick="refreshAttendanceGrid()"><i class="fas fa-sync"></i></button>
                </div>
            </div>
            <input type="file" id="att-import-file" accept=".xlsx, .xls" style="display:none;" onchange="handleAttImport(this)">

            <div id="mark-multi-modal" class="erp-modal-overlay">
                <div class="erp-modal-window" style="width:480px;">
                    <div class="erp-modal-header"><span>Mark Multiple Employees</span><span class="erp-modal-close" onclick="closeMarkMultipleModal()">&times;</span></div>
                    <div class="erp-modal-body">
                        <div class="form-row"><label class="form-label">Date Range</label>
                            <input type="date" id="mm-start" class="form-input" style="margin-right:6px;">
                            <input type="date" id="mm-end" class="form-input">
                        </div>
                        <div class="form-row"><label class="form-label">Status</label>
                            <select id="mm-status" class="form-input">
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Weekly Off">Weekly Off</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Leave">Leave</option>
                                <option value="Paid Leave">Paid Leave</option>
                                <option value="Holiday">Holiday</option>
                            </select>
                        </div>
                        <div class="form-row" style="align-items:flex-start;">
                            <label class="form-label">Employees</label>
                            <div style="flex:1;">
                                <div style="margin-bottom:6px;">
                                    <a href="#" onclick="event.preventDefault(); toggleAllMmEmployees(true)" style="font-size:12px;">Select All</a> ·
                                    <a href="#" onclick="event.preventDefault(); toggleAllMmEmployees(false)" style="font-size:12px;">Clear</a>
                                </div>
                                <div id="mm-emp-list" style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:4px; padding:6px;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="btn-gray" onclick="closeMarkMultipleModal()">Cancel</button>
                        <button class="btn-blue" onclick="applyMarkMultiple()">Apply</button>
                    </div>
                </div>
            </div>

            <div style="flex:1; overflow:auto; position:relative; background:#fff;">
                <table class="data-table" style="border-collapse: separate; border-spacing: 0;">
                    <thead style="position:sticky; top:0; z-index:10; background:#f8fafc;">
                        <tr>
                            <th style="position:sticky; left:0; z-index:20; background:#f8fafc; border-right:2px solid #ddd; min-width:180px; cursor:pointer;" onclick="setAttSort('first_name')">
                                Employee <i class="fas fa-sort" style="margin-left:5px; opacity:0.3;"></i>
                            </th>
                            <th style="min-width:60px; text-align:center;">Stats</th>
                            ${Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const dateStr = `${actualYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
        const isSun = dateObj.getDay() === 0;
        return `<th style="text-align:center; min-width:35px; ${isSun ? 'background:#fee2e2; color:red;' : ''}">
                                            <div style="font-size:10px;">${dayName}</div>
                                            <div style="font-size:14px;">${d}</div>
                                        </th>`;
    }).join('')}
                        </tr>
                    </thead>
                    <tbody id="att-grid-body">
                        <tr><td colspan="${daysInMonth + 2}" style="text-align:center; padding:20px;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div style="padding:5px 10px; background:#f1f5f9; border-top:1px solid #e2e8f0; font-size:12px; text-align:right;">
                <span id="unsaved-msg" style="color:red; display:none;">● Unsaved Changes</span>
            </div>
        </div>

        <!-- MARK ATTENDANCE MODAL -->
        <div id="att-modal" class="erp-modal-overlay" style="z-index: 3000;">
            <div class="erp-modal-window" style="width:650px; height:auto;">
                <div class="erp-modal-header" style="background: linear-gradient(to right, #3b82f6, #2563eb);">
                    <span style="color:white; font-weight:bold;">Mark Attendance</span>
                    <span class="erp-modal-close" onclick="closeAttModal()">X</span>
                </div>
                <div class="erp-modal-body" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:5px;">
                        <div><strong>Emp Code:</strong> <span id="att-modal-code" style="color:#d93025;"></span></div>
                        <div><strong>Name:</strong> <span id="att-modal-name" style="color:#d93025;"></span></div>
                        <div><strong>Day:</strong> <span id="att-modal-date" style="color:#d93025;"></span></div>
                    </div>

                    <div style="border:1px solid #eee; padding:15px; margin-bottom:15px;">
                        <input type="hidden" id="att-modal-empid">
                        <input type="hidden" id="att-modal-datestr">
                        
                        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:15px;">
                            <label><input type="radio" name="attStatus" value="Present"> <strong>P</strong> (Present)</label>
                            <label><input type="radio" name="attStatus" value="Absent"> <strong>AB</strong> (Absent)</label>
                            <label><input type="radio" name="attStatus" value="Weekly Off"> <strong>WO</strong> (W-Off)</label>
                            <label><input type="radio" name="attStatus" value="Half Day"> <strong>HD</strong> (Half Day)</label>
                            <label><input type="radio" name="attStatus" value="Leave"> <strong>L</strong> (Leave)</label>
                            
                            <label><input type="radio" name="attStatus" value="Paid Leave"> <strong>PL</strong> (Paid L)</label>
                            <label><input type="radio" name="attStatus" value="Restricted Holiday"> <strong>RH</strong></label>
                            <label><input type="radio" name="attStatus" value="Holiday"> <strong>HL</strong> (Holiday)</label>
                            <label><input type="radio" name="attStatus" value="Tour"> <strong>TP</strong> (Tour)</label>
                            <label><input type="radio" name="attStatus" value=""> <strong>-</strong> (Clear)</label>
                        </div>
                    </div>

                    <div class="form-row">
                        <label class="form-label" style="width:100px;">Remark:-</label>
                        <input type="text" id="att-modal-remark" class="form-input" placeholder="Optional remark...">
                    </div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeAttModal()">Cancel</button>
                    <!-- <button class="btn-gray" onclick="restoreDefaultAtt()">Restore Default</button> --> 
                    <button class="btn-blue" onclick="saveAttModal()">Save</button>
                </div>
            </div>
        </div>
    `;

    // Global Logic
    let currentCell = null;

    window.refreshAttendanceGrid = async () => {
        const tbody = document.getElementById('att-grid-body');
        tbody.innerHTML = '<tr><td colspan="100" style="text-align:center; padding:20px;">Loading...</td></tr>';
        modifiedRecords = {};
        updateUnsavedIndicator();

        try {
            const empRes = await window.electronAPI.getEmployees({ companyId: contextCompany, page: 1, limit: 1000 });
            allEmployees = empRes.employees.filter(e => e.status === 'Active');

            // Load Departments for filter
            const depts = await window.electronAPI.getDepartments();
            const deptSelect = document.getElementById('att-filter-dept');
            if (deptSelect && deptSelect.options.length <= 1) {
                depts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = d.name;
                    deptSelect.appendChild(opt);
                });
            }

            renderAttendanceGrid();
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="100" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
        }
    };

    window.handleAttFilter = () => {
        currentSearch = document.getElementById('att-search').value.toLowerCase();
        currentDeptId = document.getElementById('att-filter-dept').value;
        renderAttendanceGrid();
    };

    window.setAttSort = (col) => {
        if (sortCol === col) sortDir *= -1;
        else { sortCol = col; sortDir = 1; }
        renderAttendanceGrid();
    };

    window.renderAttendanceGrid = async () => {
        const tbody = document.getElementById('att-grid-body');
        if (!allEmployees || allEmployees.length === 0) return;

        let filtered = allEmployees.filter(e => {
            const matchesSearch = `${e.first_name} ${e.last_name}`.toLowerCase().includes(currentSearch) ||
                (e.employee_code || '').toLowerCase().includes(currentSearch);
            const matchesDept = currentDeptId === 'all' || e.department_id == currentDeptId;
            return matchesSearch && matchesDept;
        });

        // Sort
        filtered.sort((a, b) => {
            const v1 = a[sortCol] || '';
            const v2 = b[sortCol] || '';
            return v1.toString().localeCompare(v2.toString()) * sortDir;
        });

        try {
            const attRes = await window.electronAPI.getAttendance({ companyId: contextCompany, startDate, endDate, limit: 10000 });
            attendanceData = attRes.data;

            const attMap = {};
            attendanceData.forEach(r => {
                if (!attMap[r.employee_id]) attMap[r.employee_id] = {};
                attMap[r.employee_id][r.date] = r;
            });

            // Overlay modified records not yet saved to map
            Object.values(modifiedRecords).forEach(r => {
                if (!attMap[r.employee_id]) attMap[r.employee_id] = {};
                attMap[r.employee_id][r.date] = r;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="100" style="text-align:center; padding:20px;">No employees match filters.</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(emp => {
                const empAtt = attMap[emp.id] || {};
                let pCt = 0, aCt = 0;

                const cells = Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const dateStr = `${actualYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const record = empAtt[dateStr];
                    const status = record ? record.status : '';
                    const remark = record ? record.remarks : '';

                    let code = '';
                    let bg = '#fff';
                    let fg = '#000';

                    // Convert long status to short code & color
                    if (status === 'Present' || status === 'P') { code = 'P'; bg = '#dcfce7'; fg = '#166534'; pCt++; }
                    else if (status === 'Absent' || status === 'AB' || status === 'A') { code = 'AB'; bg = '#fee2e2'; fg = '#991b1b'; aCt++; }
                    else if (status === 'Weekly Off' || status === 'WO') { code = 'WO'; bg = '#f3f4f6'; fg = '#4b5563'; }
                    else if (status === 'Half Day' || status === 'HD') { code = 'HD'; bg = '#ffedd5'; fg = '#9a3412'; }
                    else if (status === 'Leave' || status === 'L') { code = 'L'; bg = '#fef9c3'; fg = '#854d0e'; }
                    else if (status === 'Paid Leave' || status === 'PL') { code = 'PL'; bg = '#ccfbf1'; fg = '#115e59'; }
                    else if (status === 'Holiday' || status === 'HL') { code = 'HL'; bg = '#e0e7ff'; fg = '#3730a3'; }
                    else { code = status ? status.substring(0, 2).toUpperCase() : ''; }

                    const hasRemark = remark ? '<div style="position:absolute; top:2px; right:2px; width:4px; height:4px; background:blue; border-radius:50%;"></div>' : '';

                    return `
                        <td onclick="openAttModal(${emp.id}, '${dateStr}', '${escapeJsAttr(emp.first_name)}', '${code}', '${escapeJsAttr(remark || '')}')"
                            id="cell_${emp.id}_${dateStr}"
                            style="text-align:center; cursor:pointer; background:${bg}; color:${fg}; font-weight:bold; position:relative; user-select:none; height:30px;">
                            ${code}
                            ${hasRemark}
                        </td>`;
                }).join('');

                return `
                    <tr>
                        <td style="position:sticky; left:0; background:white; border-right:2px solid #ddd; z-index:5;">
                            <div>${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</div>
                            <div style="font-size:10px; color:#888;">${escapeHtml(emp.designation_title) || 'Emp'}</div>
                        </td>
                        <td style="font-size:10px; text-align:center; background:#fafafa;">
                            <div style="color:green;">P:${pCt}</div>
                            <div style="color:red;">A:${aCt}</div>
                        </td>
                        ${cells}
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="100" style="color:red; text-align:center;">Error loading grid: ${e.message}</td></tr>`;
        }
    };

    window.openAttModal = (empId, dateStr, empName, code, currentRemark) => {
        // Find existing full status if possible, otherwise rely on code
        // We need map from code -> Full Status for Radio
        // Or we just rely on the radio matching the value

        let statusToSelect = '';
        if (code === 'P') statusToSelect = 'Present';
        if (code === 'AB') statusToSelect = 'Absent';
        if (code === 'WO') statusToSelect = 'Weekly Off';
        if (code === 'HD') statusToSelect = 'Half Day';
        if (code === 'L') statusToSelect = 'Leave';
        if (code === 'PL') statusToSelect = 'Paid Leave';
        if (code === 'HL') statusToSelect = 'Holiday';

        // Set Values
        document.getElementById('att-modal-empid').value = empId;
        document.getElementById('att-modal-datestr').value = dateStr;
        document.getElementById('att-modal-code').textContent = empId;
        document.getElementById('att-modal-name').textContent = empName;
        document.getElementById('att-modal-date').textContent = dateStr;
        document.getElementById('att-modal-remark').value = currentRemark === 'undefined' ? '' : currentRemark;

        // Reset Radios
        document.querySelectorAll('input[name="attStatus"]').forEach(r => r.checked = false);

        // Select Radio
        if (statusToSelect) {
            const radio = document.querySelector(`input[name="attStatus"][value="${statusToSelect}"]`);
            if (radio) radio.checked = true;
        }

        document.getElementById('att-modal').classList.add('active');
    };

    window.closeAttModal = () => {
        document.getElementById('att-modal').classList.remove('active');
    };

    window.saveAttModal = () => {
        const empId = document.getElementById('att-modal-empid').value;
        const dateStr = document.getElementById('att-modal-datestr').value;
        const remark = document.getElementById('att-modal-remark').value;

        const selected = document.querySelector('input[name="attStatus"]:checked');
        const status = selected ? selected.value : '';

        // Update Local State for Save
        modifiedRecords[`${empId}_${dateStr}`] = {
            employee_id: empId,
            date: dateStr,
            status: status,
            remarks: remark
        };

        // Update UI Immediately
        const cell = document.getElementById(`cell_${empId}_${dateStr}`);
        if (cell) {
            // Recalc color
            let code = '', bg = '#fff', fg = '#000';
            if (status === 'Present') { code = 'P'; bg = '#dcfce7'; fg = '#166534'; }
            else if (status === 'Absent') { code = 'AB'; bg = '#fee2e2'; fg = '#991b1b'; }
            else if (status === 'Weekly Off') { code = 'WO'; bg = '#f3f4f6'; fg = '#4b5563'; }
            else if (status === 'Half Day') { code = 'HD'; bg = '#ffedd5'; fg = '#9a3412'; }
            else if (status === 'Leave') { code = 'L'; bg = '#fef9c3'; fg = '#854d0e'; }
            else if (status === 'Paid Leave') { code = 'PL'; bg = '#ccfbf1'; fg = '#115e59'; }
            else if (status === 'Holiday') { code = 'HL'; bg = '#e0e7ff'; fg = '#3730a3'; }

            cell.style.background = bg;
            cell.style.color = fg;
            cell.innerHTML = `${code} ${remark ? '<div style="position:absolute; top:2px; right:2px; width:4px; height:4px; background:blue; border-radius:50%;"></div>' : ''}`;

            // Update onclick args to reflect new state
            cell.onclick = () => window.openAttModal(empId, dateStr, document.getElementById('att-modal-name').textContent, code, remark);
        }

        updateUnsavedIndicator();
        closeAttModal();
    };

    window.updateUnsavedIndicator = () => {
        const count = Object.keys(modifiedRecords).length;
        const ind = document.getElementById('unsaved-msg');
        if (count > 0) {
            ind.style.display = 'inline-block';
            ind.textContent = `● ${count} Unsaved Changes`;
        } else {
            ind.style.display = 'none';
        }
    };

    window.saveMonthlyAttendance = async () => {
        const records = Object.values(modifiedRecords);
        if (records.length === 0) { alert("No changes."); return; }

        const btn = document.querySelector('button[onclick="saveMonthlyAttendance()"]');
        if (btn) btn.textContent = 'Saving...';

        try {
            await window.electronAPI.invoke('add-attendance-bulk', records); // Ensure using invoke for bulk
            alert("Saved Successfully!");
            modifiedRecords = {};
            updateUnsavedIndicator();
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            if (btn) btn.textContent = '💾 Save';
        }
    };

    // Auto Fill
    window.autoFillAttendance = () => {
        if (!confirm("Mark all empty cells as 'Present' (P) and Sundays as 'Weekly Off' (WO)?")) return;

        const cells = document.querySelectorAll('td[id^="cell_"]');
        let count = 0;

        cells.forEach(cell => {
            const currentCode = cell.textContent.trim();
            if (!currentCode) {
                // Determine if Sunday
                const parts = cell.id.split('_'); // cell_EMPID_DATE
                const date = new Date(parts[2]);
                const isSun = date.getDay() === 0;

                const status = isSun ? 'Weekly Off' : 'Present';
                const empId = parts[1];
                const dateStr = parts[2];

                // Add to records
                modifiedRecords[`${empId}_${dateStr}`] = {
                    employee_id: empId,
                    date: dateStr,
                    status: status,
                    remarks: ''
                };

                // Update Visual
                const code = isSun ? 'WO' : 'P';
                const bg = isSun ? '#f3f4f6' : '#dcfce7';
                const fg = isSun ? '#4b5563' : '#166534';

                cell.style.background = bg;
                cell.style.color = fg;
                cell.textContent = code;
                count++;
            }
        });

        if (count > 0) updateUnsavedIndicator();
    };

    refreshAttendanceGrid();

    window.electronAPI.getLeaveQuickCounters().then(counters => {
        const el = document.getElementById('att-pl-rh-counters');
        if (el && counters) {
            el.innerHTML = `
                <span style="background:#ccfbf1; border:1px solid #14b8a6; padding:2px 8px; border-radius:3px;">PL: ${counters.pl}</span>
                <span style="background:#e0e7ff; border:1px solid #6366f1; padding:2px 8px; border-radius:3px;">RH: ${counters.rh}</span>
            `;
        }
    }).catch(() => {});

    window.creditLeaves = async () => {
        if (!confirm(`Are you sure you want to credit PL/CL for ${actualYear}-${String(m).padStart(2, '0')}?\nCriteria: 3 Months Tenure AND 20+ Working Days.`)) return;

        try {
            const res = await window.electronAPI.invoke('credit-monthly-leaves', { month: m, year: actualYear });
            if (res.success) {
                alert(`Successfully credited leaves to ${res.creditedCount} eligible employees.`);
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    window.saveMonthlyAttendance = saveMonthlyAttendance;
    window.autoFillAttendance = autoFillAttendance;
    window.creditLeaves = creditLeaves;

    // --- Mark Multiple Employees (bulk status apply) ---
    window.openMarkMultipleModal = () => {
        document.getElementById('mm-start').value = startDate;
        document.getElementById('mm-end').value = endDate;
        const list = document.getElementById('mm-emp-list');
        list.innerHTML = allEmployees.map(e => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer; font-size:13px;">
                <input type="checkbox" class="mm-emp-chk" value="${e.id}">
                ${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}
            </label>
        `).join('');
        document.getElementById('mark-multi-modal').classList.add('active');
    };

    window.closeMarkMultipleModal = () => document.getElementById('mark-multi-modal').classList.remove('active');

    window.toggleAllMmEmployees = (state) => {
        document.querySelectorAll('.mm-emp-chk').forEach(cb => cb.checked = state);
    };

    window.applyMarkMultiple = async () => {
        const selectedIds = Array.from(document.querySelectorAll('.mm-emp-chk:checked')).map(cb => parseInt(cb.value));
        const rangeStart = document.getElementById('mm-start').value;
        const rangeEnd = document.getElementById('mm-end').value;
        const status = document.getElementById('mm-status').value;

        if (selectedIds.length === 0) { window.showToast('Select at least one employee', 'warning'); return; }
        if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) { window.showToast('Invalid date range', 'warning'); return; }

        const records = [];
        let cursor = new Date(rangeStart);
        const end = new Date(rangeEnd);
        while (cursor <= end) {
            const dateStr = cursor.toISOString().split('T')[0];
            selectedIds.forEach(empId => records.push({ employee_id: empId, date: dateStr, status }));
            cursor.setDate(cursor.getDate() + 1);
        }

        try {
            await window.electronAPI.invoke('add-attendance-bulk', records);
            window.showToast(`Marked ${status} for ${selectedIds.length} employee(s) across ${records.length / selectedIds.length} day(s).`, 'success');
            window.closeMarkMultipleModal();
            refreshAttendanceGrid();
        } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
    };

    // --- EXCEL FEATURES ---
    window.exportAttendanceExcel = () => {
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // Prepare data for XLSX
        const rows = allEmployees.map(emp => {
            const row = {
                'ID': emp.id,
                'Code': emp.employee_code || '-',
                'Employee Name': `${emp.first_name} ${emp.last_name}`,
                'Department': emp.department_name || '-'
            };

            // Stats (P & A counts)
            let pCt = 0, aCt = 0;

            days.forEach(d => {
                const dateStr = `${actualYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                // Check modifiedRecords first, then attendanceData
                let rec = modifiedRecords[`${emp.id}_${dateStr}`] || attendanceData.find(x => x.employee_id === emp.id && x.date === dateStr);
                const status = rec ? rec.status : '';
                row[d] = status === 'Present' || status === 'P' ? 'P' : (status === 'Absent' || status === 'AB' ? 'A' : status);
                if (row[d] === 'P') pCt++;
                if (row[d] === 'A') aCt++;
            });

            row['Present Count'] = pCt;
            row['Absent Count'] = aCt;
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `Attendance_${startDate}_to_${endDate}.xlsx`);
    };

    window.downloadAttendanceTemplate = () => {
        const rows = allEmployees.map(emp => ({
            'Employee Code': emp.employee_code || '',
            'Employee Name': `${emp.first_name} ${emp.last_name}`,
            'Date (YYYY-MM-DD)': startDate,
            'Status': 'Present',
            'Remarks': ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `Attendance_Template.xlsx`);
    };

    window.triggerAttImport = () => {
        document.getElementById('att-import-file').click();
    };

    window.handleAttImport = (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);

            let count = 0;
            json.forEach(row => {
                const code = row['Employee Code'];
                const dateStr = row['Date (YYYY-MM-DD)'];
                const status = row['Status'];
                const remarks = row['Remarks'] || '';

                if (code && dateStr && status) {
                    const emp = allEmployees.find(e => e.employee_code == code);
                    if (emp) {
                        modifiedRecords[`${emp.id}_${dateStr}`] = {
                            employee_id: emp.id,
                            date: dateStr,
                            status: status,
                            remarks: remarks
                        };
                        count++;
                    }
                }
            });

            if (count > 0) {
                alert(`Imported ${count} records. Click 'Save Changes' to commit to database.`);
                renderAttendanceGrid();
                updateUnsavedIndicator();
            } else {
                alert("No valid records found in the Excel file. Ensure Column headers match: 'Employee Code', 'Date (YYYY-MM-DD)', 'Status'.");
            }
            input.value = ''; // Reset
        };
        reader.readAsArrayBuffer(file);
    };
}
