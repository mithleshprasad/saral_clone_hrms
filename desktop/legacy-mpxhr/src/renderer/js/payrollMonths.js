export async function loadPayrollMonths() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="header-actions">
            <h1>Payroll Months</h1>
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="number" id="pm-year" min="2000" style="width:100px;" />
                <select id="pm-month">${[...Array(12).keys()].map(i => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
                <button id="btn-create-pm" class="erp-btn">Create Month</button>
            </div>
        </div>
        <div class="table-container" style="margin-top:12px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Month</th>
                        <th>Status</th>
                        <th>Locked</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="pm-list">
                    <tr><td colspan="5">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    const yearInput = document.getElementById('pm-year');
    const monthInput = document.getElementById('pm-month');
    const pmList = document.getElementById('pm-list');

    const now = new Date();
    yearInput.value = now.getFullYear();
    monthInput.value = now.getMonth() + 1;

    async function refresh() {
        try {
            const months = await window.electronAPI.getPayrollMonths();
            if (!months || months.length === 0) {
                pmList.innerHTML = '<tr><td colspan="5">No months defined yet.</td></tr>';
                return;
            }

            pmList.innerHTML = months.map(m => `
                <tr>
                    <td>${m.year}</td>
                    <td>${String(m.month).padStart(2, '0')}</td>
                    <td>${m.status}</td>
                    <td>${m.locked ? 'Yes' : 'No'}</td>
                    <td>${m.locked ? '' : `<button class="btn-secondary" data-id="${m.id}" data-action="close">Close</button>`}</td>
                </tr>
            `).join('');

            // Attach close handlers
            pmList.querySelectorAll('button[data-action="close"]').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (!confirm('Close this payroll month? This will prevent new payrolls for this period.')) return;
                try {
                    await window.electronAPI.closePayrollMonth(Number(id));
                    window.showToast('Payroll month closed', 'success');
                    refresh();
                } catch (err) { window.showToast('Error closing month: ' + err.message, 'error'); }
            }));

        } catch (e) { pmList.innerHTML = `<tr><td colspan="5">Error loading months: ${e.message}</td></tr>`; }
    }

    document.getElementById('btn-create-pm').addEventListener('click', async () => {
        const year = Number(yearInput.value);
        const month = Number(monthInput.value);
        if (!year || !month) return window.showToast('Provide valid year & month', 'error');
        try {
            await window.electronAPI.createPayrollMonth({ year, month });
            window.showToast('Payroll month created', 'success');
            refresh();
        } catch (err) { window.showToast('Error creating month: ' + err.message, 'error'); }
    });

    await refresh();
}
