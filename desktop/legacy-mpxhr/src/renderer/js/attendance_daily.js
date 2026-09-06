import { escapeHtml } from './utils.js';

export async function loadDailyAttendance() {
    const contentArea = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;

    if (!contextCompany || contextCompany === 'Loading...' || contextCompany === '') {
        contentArea.innerHTML = '<div style="padding:20px; text-align:center; color:#666;"><h3>Please select a Company from the top bar first.</h3></div>';
        return;
    }

    // Default to Today
    let selectedDate = new Date().toISOString().split('T')[0];
    let allEmployees = [];
    let dailyRecords = {}; // Map: empId -> { ...record }
    let modified = false;

    // UI Structure
    contentArea.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; font-family: 'Segoe UI', sans-serif;">
            <!-- Header -->
            <div style="padding:15px; background:white; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <h2 style="margin:0; font-size:18px; color:#1e293b;">Daily Attendance</h2>
                    <input type="date" id="att-daily-date" class="form-input" style="width:150px;" value="${selectedDate}">
                    <button class="btn-secondary" onclick="fetchDailyData()"><i class="fas fa-calendar-check"></i> Load Date</button>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary" onclick="markAllPresent()"><i class="fas fa-check-circle"></i> Mark All Present</button>
                    <button class="btn-secondary" onclick="saveDailyAttendance()"><i class="fas fa-save"></i> Save</button>
                </div>
            </div>

            <!-- Grid -->
            <div style="flex:1; overflow:auto; background:#fff;">
                <table class="modern-table" style="width:100%; border-collapse:collapse;">
                    <thead style="background:#f8fafc; position:sticky; top:0; z-index:10;">
                        <tr>
                            <th style="padding:12px; text-align:left; border-bottom:2px solid #e2e8f0; color:#64748b;">Employee</th>
                            <th style="padding:12px; text-align:left; border-bottom:2px solid #e2e8f0; color:#64748b;">Designation</th>
                            <th style="padding:12px; text-align:center; border-bottom:2px solid #e2e8f0; color:#64748b; width:120px;">In Time</th>
                            <th style="padding:12px; text-align:center; border-bottom:2px solid #e2e8f0; color:#64748b; width:120px;">Out Time</th>
                            <th style="padding:12px; text-align:center; border-bottom:2px solid #e2e8f0; color:#64748b; width:100px;">Hours</th>
                            <th style="padding:12px; text-align:center; border-bottom:2px solid #e2e8f0; color:#64748b; width:150px;">Status</th>
                            <th style="padding:12px; text-align:left; border-bottom:2px solid #e2e8f0; color:#64748b;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody id="daily-att-body">
                        <tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div id="unsaved-bar" style="padding:8px 15px; background:#fff7ed; border-top:1px solid #fdba74; color:#c2410c; font-size:13px; font-weight:600; text-align:right; display:none;">
                <i class="fas fa-exclamation-triangle"></i> You have unsaved changes
            </div>
        </div>
    `;

    // Fetch and Render
    window.fetchDailyData = async () => {
        const dateInput = document.getElementById('att-daily-date');
        if (dateInput) selectedDate = dateInput.value;

        const tbody = document.getElementById('daily-att-body');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">Loading data...</td></tr>';

        try {
            // 1. Get Employees
            const empRes = await window.electronAPI.getEmployees({ companyId: contextCompany, limit: 1000 });
            allEmployees = empRes.employees.filter(e => e.status === 'Active');

            // 2. Get Existing Attendance
            const attRes = await window.electronAPI.getAttendance({
                companyId: contextCompany,
                startDate: selectedDate,
                endDate: selectedDate
            });
            const existingAtt = {};
            (attRes.data || []).forEach(r => existingAtt[r.employee_id] = r);

            // 3. Merge
            dailyRecords = {};
            allEmployees.forEach(emp => {
                const rec = existingAtt[emp.id] || {};
                dailyRecords[emp.id] = {
                    employee_id: emp.id,
                    date: selectedDate,
                    check_in_time: rec.check_in_time ? rec.check_in_time.split(' ')[1]?.substring(0, 5) : '', // extract HH:MM
                    check_out_time: rec.check_out_time ? rec.check_out_time.split(' ')[1]?.substring(0, 5) : '',
                    status: rec.status || '',
                    remarks: rec.remarks || ''
                };
            });

            renderGrid();
            modified = false;
            updateUnsaved();

        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
        }
    };

    function renderGrid() {
        const tbody = document.getElementById('daily-att-body');
        if (allEmployees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No active employees.</td></tr>';
            return;
        }

        tbody.innerHTML = allEmployees.map(emp => {
            const r = dailyRecords[emp.id];
            // Calculate Hours
            let duration = '-';
            if (r.check_in_time && r.check_out_time) {
                const start = new Date(`2000-01-01T${r.check_in_time}`);
                const end = new Date(`2000-01-01T${r.check_out_time}`);
                if (end > start) {
                    const diff = (end - start) / (1000 * 60 * 60);
                    duration = diff.toFixed(1) + ' hrs';
                }
            }

            return `
            <tr style="border-bottom:1px solid #f1f5f9; hover:background:#f8fafc;">
                <td style="padding:8px 12px;">
                    <div style="font-weight:600; color:#334155;">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</div>
                    <div style="font-size:11px; color:#94a3b8;">${emp.employee_id || emp.id}</div>
                </td>
                <td style="padding:8px 12px; color:#64748b;">${escapeHtml(emp.designation_title) || '-'}</td>
                
                <td style="padding:8px; text-align:center;">
                    <input type="time" class="form-input text-center" style="width:100px;" 
                        value="${r.check_in_time}" 
                        onchange="updateDailyRecord(${emp.id}, 'check_in_time', this.value)">
                </td>
                
                <td style="padding:8px; text-align:center;">
                    <input type="time" class="form-input text-center" style="width:100px;" 
                        value="${r.check_out_time}" 
                        onchange="updateDailyRecord(${emp.id}, 'check_out_time', this.value)">
                </td>
                
                <td style="padding:8px; text-align:center; font-weight:bold; color:#475569;">
                    ${duration}
                </td>
                
                <td style="padding:8px; text-align:center;">
                    <select class="form-input" style="width:100%; border-color:${getStatusColor(r.status)}"
                        onchange="updateDailyRecord(${emp.id}, 'status', this.value)">
                        <option value="">- Select -</option>
                        <option value="Present" ${r.status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Absent" ${r.status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Half Day" ${r.status === 'Half Day' ? 'selected' : ''}>Half Day</option>
                        <option value="Leave" ${r.status === 'Leave' ? 'selected' : ''}>Leave</option>
                        <option value="Weekly Off" ${r.status === 'Weekly Off' ? 'selected' : ''}>Weekly Off</option>
                        <option value="Holiday" ${r.status === 'Holiday' ? 'selected' : ''}>Holiday</option>
                    </select>
                </td>
                
                <td style="padding:8px;">
                    <input type="text" class="form-input" placeholder="Optional" style="width:100%;"
                        value="${escapeHtml(r.remarks)}"
                        onchange="updateDailyRecord(${emp.id}, 'remarks', this.value)">
                </td>
            </tr>
            `;
        }).join('');
    }

    window.updateDailyRecord = (empId, field, value) => {
        if (!dailyRecords[empId]) return;
        dailyRecords[empId][field] = value;
        modified = true;

        // Auto Logic: If In & Out present, set Present/Half Day
        if ((field === 'check_in_time' || field === 'check_out_time') && dailyRecords[empId].check_in_time && dailyRecords[empId].check_out_time) {
            const start = new Date(`2000-01-01T${dailyRecords[empId].check_in_time}`);
            const end = new Date(`2000-01-01T${dailyRecords[empId].check_out_time}`);
            if (end > start) {
                const hours = (end - start) / (1000 * 60 * 60);
                // Simple rule: < 4 hrs = Half Day, >= 4 = Present
                if (hours < 4.5 && dailyRecords[empId].status !== 'Half Day') {
                    dailyRecords[empId].status = 'Half Day';
                } else if (hours >= 4.5 && dailyRecords[empId].status !== 'Present') {
                    dailyRecords[empId].status = 'Present';
                }
                // Refresh grid to show new duration/status
                renderGrid();
                // Avoid re-triggering modified in loop, handled by initial set
            }
        }

        updateUnsaved();
    };

    window.markAllPresent = () => {
        if (!confirm(`Mark all empty records as 'Present'?`)) return;
        let change = false;
        Object.values(dailyRecords).forEach(r => {
            if (!r.status) {
                r.status = 'Present';
                // Default 9-6? Optional, maybe keep empty times
                change = true;
            }
        });
        if (change) {
            modified = true;
            renderGrid();
            updateUnsaved();
        }
    };

    window.saveDailyAttendance = async () => {
        if (!modified) { alert("No changes to save."); return; }

        const btn = document.querySelector('button[onclick="saveDailyAttendance()"]');
        if (btn) btn.textContent = 'Saving...';

        const payload = Object.values(dailyRecords).map(r => ({
            employee_id: r.employee_id,
            date: r.date,
            status: r.status,
            remarks: r.remarks,
            // Format for DB: YYYY-MM-DD HH:MM:SS (need to append to date)
            check_in_time: r.check_in_time ? `${r.date} ${r.check_in_time}:00` : null,
            check_out_time: r.check_out_time ? `${r.date} ${r.check_out_time}:00` : null
        }));

        try {
            await window.electronAPI.invoke('add-attendance-bulk', payload);
            alert("Attendance saved successfully!");
            modified = false;
            updateUnsaved();
        } catch (e) {
            alert("Save Failed: " + e.message);
        } finally {
            if (btn) btn.innerHTML = '💾 Save';
        }
    };

    function updateUnsaved() {
        const bar = document.getElementById('unsaved-bar');
        bar.style.display = modified ? 'block' : 'none';
    }

    function getStatusColor(s) {
        if (s === 'Present') return '#22c55e'; // Green
        if (s === 'Absent') return '#ef4444'; // Red
        if (s === 'Half Day') return '#f97316'; // Orange
        if (s === 'Holiday' || s === 'Weekly Off') return '#3b82f6'; // Blue
        return '#cbd5e1'; // Gray
    }

    // Initial Load
    fetchDailyData();
}
