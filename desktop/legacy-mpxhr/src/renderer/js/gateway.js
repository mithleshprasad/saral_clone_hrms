import { escapeHtml } from './utils.js';

export async function initGateway() {
    const gateway = document.getElementById('startup-gateway');
    const app = document.getElementById('app');

    // Ensure Gateway is visible, App is hidden
    gateway.style.display = 'flex';
    app.style.display = 'none';

    // Inject New Layout
    gateway.innerHTML = `
        <div style="display:flex; flex-direction:column; width:100%; height:100%; font-family:'Segoe UI', system-ui, sans-serif; background:#f6f7fb;">
            <!-- Branding Header -->
            <div style="background:#fff; border-bottom:1px solid #e5e7eb; padding:14px 24px; display:flex; align-items:center; gap:12px; margin-top:32px;">
                <div style="width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#004b91,#003366); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">HR</div>
                <div>
                    <div style="font-weight:700; font-size:15px; color:#1e1e2e;">MpxHR</div>
                    <div style="font-size:12px; color:#64748b;">Select a company to continue</div>
                </div>
            </div>

            <!-- Main Split View -->
            <div style="flex:1; display:flex; flex-direction:column; overflow:auto; padding:20px; align-items:center;">
                <div style="width:100%; max-width:1100px;">

                    <!-- Quick Overview (report-style stat tiles) -->
                    <div id="gw-stats" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; margin-bottom:16px;">
                        <div class="gw-stat-tile" style="background:#fff; border:1px solid #e5e7eb; border-radius:5px; padding:10px 12px; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Total Employees</div>
                            <div id="gw-stat-employees" style="font-size:24px; font-weight:700; color:#1e1e2e;">—</div>
                        </div>
                        <div class="gw-stat-tile" style="background:#fff; border:1px solid #e5e7eb; border-radius:5px; padding:10px 12px; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Departments</div>
                            <div id="gw-stat-depts" style="font-size:24px; font-weight:700; color:#1e1e2e;">—</div>
                        </div>
                        <div class="gw-stat-tile" style="background:#fff; border:1px solid #e5e7eb; border-radius:5px; padding:10px 12px; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Present Today</div>
                            <div id="gw-stat-present" style="font-size:24px; font-weight:700; color:#15803d;">—</div>
                        </div>
                        <div class="gw-stat-tile" style="background:#fff; border:1px solid #e5e7eb; border-radius:5px; padding:10px 12px; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Registered Companies</div>
                            <div id="gw-stat-companies" style="font-size:24px; font-weight:700; color:#1e1e2e;">—</div>
                        </div>
                    </div>

                    <!-- Quick Reports -->
                    <div style="margin-bottom:16px; background:#fff; border:1px solid #e5e7eb; border-radius:5px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                        <div style="padding:12px 16px; font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid #f1f5f9;">Quick Reports</div>
                        <div class="gw-report-row" onclick="enterApp('reports','emp_master')">
                            <div class="gw-report-icon" style="background:#e8f1fb; color:#004b91;"><i class="fas fa-users"></i></div>
                            <div style="flex:1;">
                                <div style="font-size:13.5px; font-weight:600; color:#1e1e2e;">Employee Master List</div>
                                <div style="font-size:12px; color:#64748b;">Active employees with salary details.</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#cbd5e1; font-size:12px;"></i>
                        </div>
                        <div class="gw-report-row" onclick="enterApp('reports','att_log')">
                            <div class="gw-report-icon" style="background:#ecfeff; color:#0891b2;"><i class="fas fa-calendar-days"></i></div>
                            <div style="flex:1;">
                                <div style="font-size:13.5px; font-weight:600; color:#1e1e2e;">Monthly Attendance Log</div>
                                <div style="font-size:12px; color:#64748b;">Detailed daily attendance status.</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#cbd5e1; font-size:12px;"></i>
                        </div>
                        <div class="gw-report-row" onclick="enterApp('reports','sal_sheet')">
                            <div class="gw-report-icon" style="background:#f0fdf4; color:#15803d;"><i class="fas fa-sack-dollar"></i></div>
                            <div style="flex:1;">
                                <div style="font-size:13.5px; font-weight:600; color:#1e1e2e;">Salary Sheet</div>
                                <div style="font-size:12px; color:#64748b;">Monthly payroll statement.</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#cbd5e1; font-size:12px;"></i>
                        </div>
                        <div class="gw-report-row" onclick="enterApp('reports','pf_esi')" style="border-bottom:none;">
                            <div class="gw-report-icon" style="background:#fef3c7; color:#b45309;"><i class="fas fa-building-columns"></i></div>
                            <div style="flex:1;">
                                <div style="font-size:13.5px; font-weight:600; color:#1e1e2e;">PF &amp; ESI Statement</div>
                                <div style="font-size:12px; color:#64748b;">Provident Fund &amp; ESI report.</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#cbd5e1; font-size:12px;"></i>
                        </div>
                    </div>

                <div style="width:100%; display:flex; flex-direction:column; background:#fff; border:1px solid #e5e7eb; border-radius:5px; box-shadow:0 1px 2px rgba(15,23,42,0.06); overflow:hidden;">

                    <!-- Filters -->
                    <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9; display:grid; grid-template-columns: 120px 1fr 1fr; gap:14px; flex-shrink:0;">
                        <div><label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:5px;">CodeNo</label><input type="text" class="erp-input" disabled></div>
                        <div><label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:5px;">Name</label><input type="text" class="erp-input" disabled></div>
                        <div><label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:5px;">Father Name / Signing Person</label><input type="text" class="erp-input" disabled></div>
                    </div>

                    <!-- Grid -->
                    <div style="overflow:auto; flex-shrink:1;">
                        <table class="erp-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th style="width:80px;">CodeNo</th>
                                    <th>Name</th>
                                    <th>Father Name / Signing Person</th>
                                    <th style="width:120px;">PAN</th>
                                    <th style="width:80px; text-align:center;">Status</th>
                                </tr>
                            </thead>
                            <tbody id="gw-grid-body">
                                <tr><td colspan="5" style="padding:30px; text-align:center; color:#94a3b8;">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer Buttons -->
                    <div style="padding:14px 20px; display:flex; gap:8px; border-top:1px solid #f1f5f9; background:#fafbfc; flex-shrink:0;">
                        <button class="erp-btn" id="gw-btn-add"><i class="fas fa-plus"></i> Add</button>
                        <button class="erp-btn" id="gw-btn-mod"><i class="fas fa-pen"></i> Modify</button>
                        <button class="erp-btn"><i class="fas fa-filter"></i> Filter</button>
                        <button class="erp-btn"><i class="fas fa-layer-group"></i> Group</button>
                        <button class="erp-btn erp-btn-primary" id="gw-btn-ok" style="margin-left:auto;"><i class="fas fa-arrow-right"></i> Continue</button>
                        <button class="erp-btn">Show All</button>
                    </div>
                </div>
                </div>
            </div>
        </div>

        <!-- NEW/EDIT COMPANY MODAL (Internal to Gateway) -->
        <div id="gw-modal" class="erp-modal-overlay" style="z-index:9000;">
            <div class="erp-modal-window" style="width:420px; height:auto;">
                <div class="erp-modal-header">
                    <span id="gw-modal-title">Company Info</span>
                    <span class="erp-modal-close" onclick="closeGwModal()">&times;</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="gw-id">
                    <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:500; color:#334155;">Company Name *</label>
                    <input type="text" id="gw-name" class="erp-input" style="width:100%; margin-bottom:14px;">

                    <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:500; color:#334155;">Address</label>
                    <input type="text" id="gw-addr" class="erp-input" style="width:100%; margin-bottom:14px;">

                    <label style="display:block; margin-bottom:6px; font-size:13px; font-weight:500; color:#334155;">Phone</label>
                    <input type="text" id="gw-phone" class="erp-input" style="width:100%;">
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeGwModal()">Cancel</button>
                    <button class="btn-blue" onclick="saveGwModal()">Save</button>
                </div>
            </div>
        </div>

        <style>
            .gw-row { cursor: pointer; }
            .gw-row.selected { background: rgba(79, 70, 229, 0.08) !important; }
            .gw-row.selected td { color: #4338ca; font-weight: 600; }
            .gw-report-row { display:flex; align-items:center; gap:12px; padding:8px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9; transition:background-color 0.1s; }
            .gw-report-row:hover { background:#eef2f6; }
            .gw-report-icon { width:30px; height:30px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
        </style>
    `;

    await loadGatewayCompanies();
    loadGatewayStats();

    // Wiring
    document.getElementById('gw-btn-add').onclick = () => openGwModal('new');
    document.getElementById('gw-btn-mod').onclick = () => openGwModal('edit');
    document.getElementById('gw-btn-ok').onclick = () => enterApp();

    // Fix Exit Button
    const exitBtn = document.getElementById('btn-exit');
    if (exitBtn) exitBtn.onclick = () => window.electronAPI.close();

    // Global exposure needed?
    window.closeGwModal = closeGwModal;
    window.saveGwModal = saveGwModal;
    window.selectGwRow = selectGwRow;
    window.enterApp = enterApp;
    window.loadGatewayCompanies = loadGatewayCompanies; // Fix ReferenceError
}

let selectedCompId = null;
let allComps = [];

async function loadGatewayCompanies() {
    try {
        allComps = await window.electronAPI.getCompanies();
        const tbody = document.getElementById('gw-grid-body');

        if (allComps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No companies. Click ADD.</td></tr>';
            return;
        }

        tbody.innerHTML = allComps.map(c => `
            <tr class="gw-row ${selectedCompId === c.id ? 'selected' : ''}" onclick="selectGwRow(${c.id})" ondblclick="enterApp()">
                <td>${c.id}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.phone) || '-'}</td>
                <td>${escapeHtml(c.pan) || '-'}</td>
                <td style="text-align:center;">Active</td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function loadGatewayStats() {
    try {
        const stats = await window.electronAPI.getDashboardStats();
        document.getElementById('gw-stat-employees').textContent = stats.totalEmployees ?? '0';
        document.getElementById('gw-stat-depts').textContent = stats.departments ?? '0';
        document.getElementById('gw-stat-present').textContent = stats.presentToday ?? '0';
        document.getElementById('gw-stat-companies').textContent = allComps.length;
    } catch (e) {
        console.error("Gateway stats error:", e);
    }
}

function selectGwRow(id) {
    selectedCompId = id;
    loadGatewayCompanies(); // Re-render to show selection
}

function openGwModal(mode) {
    if (mode === 'edit') {
        if (!selectedCompId) return alert("Select a company first");
        const c = allComps.find(x => x.id === selectedCompId);
        document.getElementById('gw-id').value = c.id;
        document.getElementById('gw-name').value = c.name;
        document.getElementById('gw-addr').value = c.address || '';
        document.getElementById('gw-phone').value = c.phone || '';
        document.getElementById('gw-modal-title').textContent = "Edit Company";
    } else {
        document.getElementById('gw-id').value = '';
        document.getElementById('gw-name').value = '';
        document.getElementById('gw-addr').value = '';
        document.getElementById('gw-phone').value = '';
        document.getElementById('gw-modal-title').textContent = "New Company";
    }
    document.getElementById('gw-modal').classList.add('active');
}

function closeGwModal() {
    document.getElementById('gw-modal').classList.remove('active');
}

async function saveGwModal() {
    const id = document.getElementById('gw-id').value;
    const name = document.getElementById('gw-name').value;
    const addr = document.getElementById('gw-addr').value;
    const phone = document.getElementById('gw-phone').value;

    if (!name) return alert("Name is required");

    try {
        if (id) {
            await window.electronAPI.invoke('update-company', { id, name, address: addr, phone, logo: '' });
        } else {
            await window.electronAPI.addCompany({ name, address: addr, phone, logo: '' });
        }
        closeGwModal();
        await loadGatewayCompanies();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function enterApp(targetPage, targetReportId) {
    // Convenience: if nothing was clicked but there's only one company, use it.
    if (!selectedCompId && allComps.length === 1) selectedCompId = allComps[0].id;
    if (!selectedCompId) return alert("Select a company");
    const c = allComps.find(x => x.id === selectedCompId);

    // Set Global State
    window.state = window.state || {};
    window.state.companyId = c.id;
    window.state.companyName = c.name;

    // Persist to Context Bar
    const ctxComp = document.getElementById('ctx-company');
    if (ctxComp) {
        // If option exists select it, else reload options?
        // Context bar usually loads companies on init.
        // We'll trust it syncs or force it.
        ctxComp.value = c.id;
    }

    // Hide Gateway, Show App
    document.getElementById('startup-gateway').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    if (window.initRibbon) window.initRibbon();
    if (window.loadPage) window.loadPage(targetPage || 'dashboard');

    if (targetReportId) {
        setTimeout(() => { if (window.selectReport) window.selectReport(targetReportId); }, 60);
    }
}
