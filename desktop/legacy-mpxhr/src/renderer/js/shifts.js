import { escapeHtml } from './utils.js';

export async function loadShifts() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="header-actions">
            <h1>Shift & Roster Management</h1>
            <div id="rostering-controls" class="hidden">
                 <button class="erp-btn" onclick="window.saveRoster()">💾 Save Roster</button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchShiftTab('config')">Shift Configuration</button>
            <button class="tab-btn" onclick="switchShiftTab('roster')">Roster Planner</button>
        </div>

        <!-- Tab 1: Config -->
        <div id="tab-config" class="tab-content fade-in">
             <div class="card" style="max-width:600px;">
                <h3>Defined Shifts</h3>
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Action</th></tr></thead>
                    <tbody id="shift-list"></tbody>
                </table>
                <hr>
                <h4>Add New Shift</h4>
                <form onsubmit="addShift(event)" style="display:flex; gap:10px; align-items:end;">
                    <div><label>Name</label><input type="text" name="name" placeholder="e.g. Morning" required></div>
                    <div><label>Start</label><input type="time" name="start_time" required></div>
                    <div><label>End</label><input type="time" name="end_time" required></div>
                    <button class="erp-btn">Add</button>
                </form>
             </div>
        </div>

        <!-- Tab 2: Roster -->
        <div id="tab-roster" class="tab-content hidden fade-in">
             <div class="header-actions" style="margin-bottom:15px; justify-content:start; gap:20px;">
                 <label>Week Starting:</label>
                 <input type="date" id="roster-start-date" onchange="loadRosterGrid()">
             </div>
             <div style="overflow-x:auto;">
                <table class="data-table" id="roster-table">
                    <!-- Dynamic Header & Body -->
                </table>
             </div>
        </div>
    `;

    // --- Definitions ---
    window.switchShiftTab = (tab) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tab}`).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        event.target.classList.add('active');

        if (tab === 'roster') {
            document.getElementById('rostering-controls').classList.remove('hidden');
            loadRosterGrid();
        } else {
            document.getElementById('rostering-controls').classList.add('hidden');
        }
    }

    // --- Sub-module: Config ---
    window.refreshShiftList = async () => {
        window.allShifts = await window.electronAPI.getShifts();
        document.getElementById('shift-list').innerHTML = window.allShifts.map(s => `
            <tr>
                <td>${escapeHtml(s.name)}</td>
                <td>${s.start_time}</td>
                <td>${s.end_time}</td>
                <td><button onclick="deleteShift(${s.id})" style="color:red;">🗑</button></td>
            </tr>
        `).join('');
    };

    window.addShift = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await window.electronAPI.addShift(data);
        e.target.reset();
        refreshShiftList();
    };

    window.deleteShift = async (id) => {
        if (confirm("Delete shift type?")) {
            await window.electronAPI.deleteShift(id);
            refreshShiftList();
        }
    };


    // --- Sub-module: Roster ---
    window.loadRosterGrid = async () => {
        const startStr = document.getElementById('roster-start-date').value;
        if (!startStr) return;

        const startDate = new Date(startStr);
        // Calculate week dates
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        const endDate = dates[6];

        // Fetch Data
        try {
            const employees = (await window.electronAPI.getEmployees({ limit: 1000 })).employees || [];
            const roster = await window.electronAPI.getRoster({ startDate: startStr, endDate });

            // Build Table Header
            let html = `<thead><tr><th>Employee</th>`;
            html += dates.map(d => `<th>${new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</th>`).join('');
            html += `</tr></thead><tbody id="roster-body">`;

            // Build Rows
            html += employees.map(emp => {
                let row = `<tr><td style="font-weight:bold;">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</td>`;
                row += dates.map(date => {
                    const assign = roster.find(r => r.employee_id === emp.id && r.date === date);
                    const shiftId = assign ? assign.shift_id : '';

                    return `<td>
                        <select class="roster-select" data-emp="${emp.id}" data-date="${date}" style="width:100%; border:none; background:transparent;">
                            <option value="">Off</option>
                            ${window.allShifts.map(s => `<option value="${s.id}" ${s.id === shiftId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </td>`;
                }).join('');
                row += `</tr>`;
                return row;
            }).join('');

            html += `</tbody>`;
            document.getElementById('roster-table').innerHTML = html;
        } catch (e) { console.error(e); }
    };

    window.saveRoster = async () => {
        const selects = document.querySelectorAll('.roster-select');
        let updates = 0;

        for (const sel of selects) {
            const shiftId = sel.value ? parseInt(sel.value) : null;
            await window.electronAPI.updateRoster({
                employeeId: parseInt(sel.dataset.emp),
                date: sel.dataset.date,
                shiftId: shiftId
            });
            updates++;
        }
        window.showToast(`Roster saved!`, 'success');
    };

    // Initialize
    window.allShifts = [];
    refreshShiftList();

    // Set Roster Start to current week's Monday
    const today = new Date();
    const day = today.getDay(); // 0-6
    const diff = today.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    document.getElementById('roster-start-date').value = monday.toISOString().split('T')[0];
}
