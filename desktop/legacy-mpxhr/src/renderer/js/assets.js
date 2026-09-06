import { escapeHtml, escapeJsAttr } from './utils.js';

export async function loadAssets() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="header-actions">
            <h1>Asset Management</h1>
            <input type="text" placeholder="Search Assets..." onkeyup="assetSearch=this.value; refreshAssets(true)" style="padding:8px; border:1px solid #ccc; border-radius:4px;">
            <button id="add-asset-btn" class="erp-btn">+ Add New Asset</button>
        </div>

        <!-- Asset Stats -->
        <div class="dashboard-grid" style="margin-bottom: 25px;">
            <div class="stat-card" style="border-left: 4px solid #2563eb;">
                <h3>Total Assets</h3>
                <div class="value" id="stat-total-assets">0</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #16a34a;">
                <h3>Available</h3>
                <div class="value" id="stat-available-assets">0</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #d97706;">
                <h3>Assigned</h3>
                <div class="value" id="stat-assigned-assets">0</div>
            </div>
        </div>

        <div class="table-container fade-in">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Asset Name</th>
                        <th>Type</th>
                        <th>Serial No.</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Since</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="asset-list">
                    <tr><td colspan="7" class="loading-text">Loading inventory...</td></tr>
                </tbody>
            </table>
        </div>
        <!-- Pagination Controls -->
        <div id="asset-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-top: 1px solid #eee;"></div>

        <!-- Add Asset Modal -->
        <div id="asset-modal" class="modal hidden">
            <div class="modal-content glass-panel">
                <div class="modal-header">
                    <h2>Add New Asset</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <form id="asset-form">
                    <div class="form-group">
                        <label>Asset Name</label>
                        <input type="text" name="name" placeholder="e.g. MacBook Pro M3" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Type</label>
                            <select name="type">
                                <option value="Laptop">Laptop / PC</option>
                                <option value="Mobile">Mobile Phone</option>
                                <option value="Accessory">Accessory</option>
                                <option value="License">Software License</option>
                                <option value="Vehicle">Vehicle</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Value (₹)</label>
                            <input type="number" name="value" placeholder="e.g. 150000">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Serial / Tag Number</label>
                        <input type="text" name="serial_number" required>
                    </div>
                    <button type="submit" class="erp-btn" style="width:100%; margin-top:15px;">Add to Inventory</button>
                </form>
            </div>
        </div>

        <!-- Assign Modal -->
        <div id="assign-modal" class="modal hidden">
            <div class="modal-content glass-panel">
                <div class="modal-header">
                    <h2>Assign Asset</h2>
                    <span class="close-modal close-assign">&times;</span>
                </div>
                <div style="margin-bottom:15px; font-weight:bold; color:var(--accent-primary);" id="assign-asset-name"></div>
                <form id="assign-form">
                    <input type="hidden" name="assetId" id="assign-asset-id">
                    <div class="form-group">
                        <label>Select Employee</label>
                        <select name="employeeId" id="assign-emp-select" required>
                            <option value="">Loading...</option>
                        </select>
                    </div>
                    <button type="submit" class="erp-btn" style="width:100%;">Confirm Assignment</button>
                </form>
            </div>
        </div>
    `;

    refreshAssets();

    // Event Listeners
    const modal = document.getElementById('asset-modal');
    const assignModal = document.getElementById('assign-modal');

    document.getElementById('add-asset-btn').onclick = () => modal.classList.remove('hidden');

    document.querySelector('.close-modal').onclick = () => modal.classList.add('hidden');
    document.querySelector('.close-assign').onclick = () => assignModal.classList.add('hidden');

    document.getElementById('asset-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            await window.electronAPI.addAsset(data);
            modal.classList.add('hidden');
            e.target.reset();
            refreshAssets();
        } catch (err) { alert(err.message); }
    };

    document.getElementById('assign-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            await window.electronAPI.assignAsset(data);
            assignModal.classList.add('hidden');
            refreshAssets();
        } catch (err) { alert(err.message); }
    };
}

// State
let currentPage = 1;
const itemsPerPage = 50;
let assetSearch = '';

async function refreshAssets(resetPage = false) {
    if (resetPage) currentPage = 1;

    try {
        const result = await window.electronAPI.getAssets({
            page: currentPage,
            limit: itemsPerPage,
            search: assetSearch
        });

        const assets = result.data;
        const total = result.total;
        const totalPages = result.totalPages;

        // Stats - Update stats (Ideally backend should provide stats if paginated)
        // With pagination, filtering pure arrays for stats is wrong if looking at "available".
        // But for UI simplification, let's keep stats roughly static or fetch separately?
        // Let's hide stats logic for now or accept it reflects ONLY current page or Total?
        // Actually ipc getAssets returns total. For status breakdown, we need separate stats API or trust "Total" for now.
        // We'll just show Total Assets = result.total. Avail/Assigned breakdown is hard without extra query.
        document.getElementById('stat-total-assets').textContent = total;
        // Resetting others to '?' or simple calculation if available in result
        document.getElementById('stat-available-assets').textContent = '?';
        document.getElementById('stat-assigned-assets').textContent = '?';

        const tbody = document.getElementById('asset-list');
        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-text">No assets recorded.</td></tr>';
            return;
        }

        tbody.innerHTML = assets.map(a => `
            <tr>
                <td><div style="font-weight:600;">${escapeHtml(a.name)}</div></td>
                <td>${escapeHtml(a.type)}</td>
                <td style="font-family:monospace;">${escapeHtml(a.serial_number)}</td>
                <td><span class="status-badge ${a.status.toLowerCase()}">${escapeHtml(a.status)}</span></td>
                <td>${a.first_name ? `${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}` : '-'}</td>
                <td>${a.assigned_date || '-'}</td>
                <td>
                    ${a.status === 'Available' ?
                `<button class="erp-btn" style="padding:4px 10px; font-size:0.8rem;" onclick="openAssign(${a.id}, '${escapeJsAttr(a.name)}')">Assign</button>` :
                `<button class="btn-secondary" style="padding:4px 10px; font-size:0.8rem;" onclick="returnAsset(${a.id})">Return</button>`
            }
                    <button class="icon-btn danger" onclick="deleteAsset(${a.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');



        renderPagination(total, totalPages);

        // Global Handlers
        window.openAssign = async (id, name) => {
            document.getElementById('assign-asset-id').value = id;
            document.getElementById('assign-asset-name').textContent = `Asset: ${name} `;

            // Fetch Emps
            // Fetch Emps
            let emps = [];
            try {
                const empsResult = await window.electronAPI.getEmployees({ limit: 1000 });
                emps = empsResult.employees || empsResult;
                if (!Array.isArray(emps)) emps = [];
            } catch (e) { console.error(e); }

            const select = document.getElementById('assign-emp-select');
            select.innerHTML = '<option value="">Select Employee</option>' +
                (Array.isArray(emps) ? emps : []).map(e => `<option value="${e.id}">${e.first_name} ${e.last_name}</option>`).join('');

            document.getElementById('assign-modal').classList.remove('hidden');
        };

        window.returnAsset = async (id) => {
            if (confirm("Confirm asset return?")) {
                await window.electronAPI.returnAsset(id);
                refreshAssets();
            }
        };

        window.deleteAsset = async (id) => {
            if (confirm("Delete this asset permanently?")) {
                await window.electronAPI.deleteAsset(id);
                refreshAssets();
            }
        };

    } catch (e) {
        console.error(e);
    }
}

function renderPagination(total, totalPages) {
    const container = document.getElementById('asset-pagination');
    if (!container) return;

    container.innerHTML = `
        <div style="flex:1;">Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, total)} of ${total}</div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="changeAssetPage(${currentPage - 1})">Prev</button>
                    <span>Page ${currentPage} of ${Math.max(1, totalPages)}</span>
                    <button class="btn-secondary" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changeAssetPage(${currentPage + 1})">Next</button>
                </div>
        `;
}

window.changeAssetPage = (p) => {
    currentPage = p;
    refreshAssets();
};
