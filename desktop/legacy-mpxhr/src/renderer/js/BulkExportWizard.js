
export async function showBulkExportWizard(contextCompany, contextYear) {
    const months = [
        { id: 4, name: "April" }, { id: 5, name: "May" }, { id: 6, name: "June" },
        { id: 7, name: "July" }, { id: 8, name: "August" }, { id: 9, name: "September" },
        { id: 10, name: "October" }, { id: 11, name: "November" }, { id: 12, name: "December" },
        { id: 1, name: "January" }, { id: 2, name: "February" }, { id: 3, name: "March" }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'erp-modal-overlay active';
    overlay.style.zIndex = '9999';

    const windowDiv = document.createElement('div');
    windowDiv.className = 'erp-modal-window';
    windowDiv.style.width = '600px';
    windowDiv.style.height = 'auto';

    windowDiv.innerHTML = `
        <div class="erp-modal-header">
            <span>Bulk Export Payslips</span>
            <span class="erp-modal-close">X</span>
        </div>
        <div class="erp-modal-body" style="padding:20px;">
            <div style="margin-bottom:20px;">
                <label style="font-weight:700; display:block; margin-bottom:10px; color:#1e293b;">1. Select Months (${contextYear})</label>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                    ${months.map(m => `
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px;">
                            <input type="checkbox" class="wizard-month-cb" value="${m.id}"> ${m.name}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <label style="font-weight:700; display:block; margin-bottom:10px; color:#1e293b;">2. Export Format</label>
                <div style="display:flex; gap:20px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="export-format" value="pdf" checked> PDF (.pdf)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="export-format" value="word"> Word (.doc)
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="radio" name="export-format" value="both"> Both
                    </label>
                </div>
            </div>

            <div style="background:#fff7ed; border:1px solid #ffedd5; padding:12px; border-radius:6px; color:#9a3412; font-size:12px;">
                <i class="fas fa-info-circle"></i> This will generate and bundle payslips for all employees in the selected months.
            </div>
        </div>
        <div class="erp-modal-footer">
            <button class="btn-gray" id="wizard-cancel">Cancel</button>
            <button class="btn-blue" id="wizard-start">
                <i class="fas fa-download" style="margin-right:8px;"></i> Start Bulk Export
            </button>
        </div>
    `;

    overlay.appendChild(windowDiv);
    document.body.appendChild(overlay);

    // Event Listeners
    overlay.querySelector('.erp-modal-close').onclick = () => overlay.remove();
    overlay.querySelector('#wizard-cancel').onclick = () => overlay.remove();

    overlay.querySelector('#wizard-start').onclick = async () => {
        const selectedMonths = Array.from(overlay.querySelectorAll('.wizard-month-cb:checked')).map(cb => parseInt(cb.value));
        const format = overlay.querySelector('input[name="export-format"]:checked').value;

        if (selectedMonths.length === 0) {
            window.showToast("Please select at least one month.", "error");
            return;
        }

        overlay.remove();
        window.showLoader();

        try {
            // First, fetch all payroll IDs for these months
            let allIds = [];
            for (const month of selectedMonths) {
                // Approximate year logic if fiscal
                let queryYear = parseInt(contextYear.split('-')[0]);
                if (month <= 3) queryYear += 1;

                const res = await window.electronAPI.getPayroll({
                    month: month,
                    year: queryYear,
                    companyId: contextCompany
                });
                const rows = Array.isArray(res) ? res : (res.data || []);
                // Only include Paid/Saved records
                const paidRows = rows.filter(r => r.status === 'Paid');
                allIds = allIds.concat(paidRows.map(r => r.id));
            }

            if (allIds.length === 0) {
                window.hideLoader();
                window.showToast("No payroll records found for selected months.", "info");
                return;
            }

            // Trigger backend bundle
            const downloadRes = await window.electronAPI.invoke('download-multiple-payslips', { ids: allIds, format });
            window.hideLoader();

            if (downloadRes.success) {
                window.showToast("Bulk export completed successfully!", "success");
            } else if (downloadRes.error) {
                window.showToast("Export failed: " + downloadRes.error, "error");
            }
        } catch (e) {
            window.hideLoader();
            window.showToast("Wizard Error: " + e.message, "error");
        }
    };
}
