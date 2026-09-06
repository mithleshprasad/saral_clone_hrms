export async function loadDashboard() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="dash-4-col">
            <!-- Col 1: Recently Viewed (Purple) -->
            <div class="dash-col">
                <div class="dash-header dash-header-yellow">Recently Viewed Pages</div>
                <div class="dash-list bg-yellow-tint">
                    <ul id="dash-recent-list">
                        <li>Loading...</li>
                    </ul>
                </div>
            </div>

            <!-- Col 2: Request Links (Green) -->
            <div class="dash-col">
                <div class="dash-header dash-header-green">Request Links</div>
                <div class="dash-list">
                    <ul>
                        <li onclick="window.showToast('TDS Request', 'info')"><i class="fas fa-caret-right"></i> TDS Request</li>
                        <li onclick="navToBulk('loans')"><i class="fas fa-caret-right"></i> Loan Requests</li>
                        <li onclick="window.showToast('Leave Application', 'info')"><i class="fas fa-caret-right"></i> Leave Application Received</li>
                        <li onclick="window.showToast('General Request', 'info')"><i class="fas fa-caret-right"></i> General Request</li>
                        <li onclick="window.showToast('Attendance Req', 'info')"><i class="fas fa-caret-right"></i> Mark Attendance Request</li>
                        <li onclick="window.showToast('Reimbursement', 'info')"><i class="fas fa-caret-right"></i> Reimbursement Request</li>
                    </ul>
                </div>
            </div>

            <!-- Col 3: Bulk Changes Links (Blue) -->
            <div class="dash-col">
                <div class="dash-header dash-header-blue">Bulk Changes Links</div>
                <div class="dash-list bg-blue-tint">
                    <ul>
                        <li onclick="navToBulk('branch')"><i class="fas fa-caret-right"></i> Change Branch</li>
                        <li onclick="navToBulk('designation')"><i class="fas fa-caret-right"></i> Change Designation</li>
                        <li onclick="navToBulk('employee')"><i class="fas fa-caret-right"></i> Change Employee Details</li>
                        <li onclick="navToBulk('salary')"><i class="fas fa-caret-right"></i> Change Salary Definition</li>
                        <li onclick="navToBulk('shift')"><i class="fas fa-caret-right"></i> Change Shift</li>
                        <li onclick="navToBulk('category')"><i class="fas fa-caret-right"></i> Change Category</li>
                        <li onclick="navToBulk('employee')"><i class="fas fa-caret-right"></i> Change PF Applicable</li>
                    </ul>
                </div>
            </div>

            <!-- Col 4: Utility Links (Orange) -->
            <div class="dash-col">
                <div class="dash-header dash-header-orange">Utility Links</div>
                <div class="dash-list">
                    <ul>
                         <li onclick="navToBulk('loans')"><i class="fas fa-caret-right"></i> Current Running Loans</li>
                         <li onclick="openEmiCalculator()"><i class="fas fa-caret-right"></i> EMI Calculator</li>
                         <li onclick="open80CInfo()"><i class="fas fa-caret-right"></i> Deduction 80C</li>
                         <li onclick="navToBulk('salary')"><i class="fas fa-caret-right"></i> Allowance & Deductions</li>
                         <li onclick="window.showToast('Not built yet — coming in a future update', 'info')"><i class="fas fa-caret-right"></i> Grade Entry</li>
                         <li onclick="window.showToast('Not built yet — coming in a future update', 'info')"><i class="fas fa-caret-right"></i> Reimbursement</li>
                         <li onclick="navToBulk('employee')"><i class="fas fa-caret-right"></i> Employees Documents</li>
                         <li onclick="window.showToast('Not built yet — coming in a future update', 'info')"><i class="fas fa-caret-right"></i> Full & Final Settlement</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    loadRecentPages();

    // Navigation Helper
    window.navToBulk = (type) => {
        if (type === 'loans') {
            if (window.loadPage) window.loadPage('loans');
            return;
        }
        if (type === 'branch') {
            if (window.loadPage) window.loadPage('branches');
            setTimeout(() => {
                if (window.toggleBranchBulk && !window.isBulkEdit) window.toggleBranchBulk();
            }, 400);
        }
        else if (type === 'designation') {
            if (window.loadPage) window.loadPage('designations');
            setTimeout(() => {
                if (window.toggleDesigBulk && !window.isBulkEdit) window.toggleDesigBulk();
            }, 400);
        }
        else if (type === 'employee') {
            if (window.loadPage) window.loadPage('employees');
            setTimeout(() => {
                if (window.toggleBulkEdit) {
                    const editBtn = document.getElementById('btn-bulk-edit');
                    if (editBtn && !editBtn.innerHTML.includes('Cancel')) {
                        window.toggleBulkEdit();
                    }
                }
            }, 400);
        }
        else if (type === 'salary') {
            if (window.loadPage) window.loadPage('salary-heads');
        }
        else if (type === 'shift') {
            if (window.loadPage) window.loadPage('shifts');
        }
        else if (type === 'category') {
            if (window.loadPage) window.loadPage('categories');
        }
    };

    window.openEmiCalculator = () => {
        const html = `
            <div id="emi-calc-modal" class="erp-modal-overlay active">
                <div class="erp-modal-window" style="width:380px;">
                    <div class="erp-modal-header"><span>EMI Calculator</span><span class="erp-modal-close" onclick="document.getElementById('emi-calc-modal').remove()">&times;</span></div>
                    <div class="erp-modal-body">
                        <div class="form-row"><label class="form-label">Loan Amount</label><input type="number" id="emi-principal" class="form-input" placeholder="e.g. 100000"></div>
                        <div class="form-row"><label class="form-label">Interest Rate (% p.a.)</label><input type="number" step="0.01" id="emi-rate" class="form-input" placeholder="e.g. 10"></div>
                        <div class="form-row"><label class="form-label">Tenure (months)</label><input type="number" id="emi-months" class="form-input" placeholder="e.g. 12"></div>
                        <button class="btn-blue" style="width:100%; margin-top:8px;" onclick="calculateEmi()">Calculate</button>
                        <div id="emi-result" style="margin-top:16px; display:none; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:12px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Monthly EMI</span><b id="emi-out-monthly">-</b></div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Total Interest</span><b id="emi-out-interest">-</b></div>
                            <div style="display:flex; justify-content:space-between;"><span>Total Payment</span><b id="emi-out-total">-</b></div>
                        </div>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="btn-gray" onclick="document.getElementById('emi-calc-modal').remove()">Close</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.calculateEmi = () => {
        const p = parseFloat(document.getElementById('emi-principal').value) || 0;
        const annualRate = parseFloat(document.getElementById('emi-rate').value) || 0;
        const n = parseInt(document.getElementById('emi-months').value) || 0;
        if (p <= 0 || n <= 0) { window.showToast('Enter a valid amount and tenure', 'warning'); return; }

        const r = annualRate / 12 / 100;
        let emi;
        if (r === 0) emi = p / n;
        else emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

        const total = emi * n;
        const interest = total - p;

        document.getElementById('emi-out-monthly').textContent = '₹' + emi.toFixed(2);
        document.getElementById('emi-out-interest').textContent = '₹' + interest.toFixed(2);
        document.getElementById('emi-out-total').textContent = '₹' + total.toFixed(2);
        document.getElementById('emi-result').style.display = 'block';
    };

    window.open80CInfo = () => {
        const html = `
            <div id="c80-modal" class="erp-modal-overlay active">
                <div class="erp-modal-window" style="width:460px;">
                    <div class="erp-modal-header"><span>Section 80C — Quick Reference</span><span class="erp-modal-close" onclick="document.getElementById('c80-modal').remove()">&times;</span></div>
                    <div class="erp-modal-body" style="font-size:13px; line-height:1.7; color:#334155;">
                        <p>Section 80C of the Income Tax Act allows a deduction of up to <b>₹1,50,000</b> per financial year from taxable income, for eligible investments/expenses such as:</p>
                        <ul style="padding-left:20px;">
                            <li>Employee Provident Fund (EPF) contribution</li>
                            <li>Public Provident Fund (PPF)</li>
                            <li>Life insurance premiums</li>
                            <li>ELSS mutual funds</li>
                            <li>National Savings Certificate (NSC)</li>
                            <li>5-year tax-saving fixed deposits</li>
                            <li>Principal repayment on home loan</li>
                            <li>Children's tuition fees</li>
                        </ul>
                        <p style="font-size:11px; color:#94a3b8;">Reference only — verify current limits with the Income Tax Department before relying on this for statutory filing.</p>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="btn-blue" onclick="document.getElementById('c80-modal').remove()">Close</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };
}

function loadRecentPages() {
    const list = document.getElementById('dash-recent-list');
    let history = [];
    try { history = JSON.parse(localStorage.getItem('recentPages') || '[]'); } catch (e) { }

    if (history.length === 0) {
        list.innerHTML = '<li style="cursor:default;"><i class="fas fa-info-circle"></i> No pages visited yet this session.</li>';
        return;
    }

    list.innerHTML = history.map(h => `
        <li onclick="window.loadPage && window.loadPage('${h.page}')"><i class="fas fa-caret-right"></i> ${h.label}</li>
    `).join('');
}
