import { showBulkExportWizard } from './BulkExportWizard.js';
import { escapeHtml } from './utils.js';

window.currentPayslipData = [];

// Global Helpers for Payslips (available for other modules like Payroll)
window.printHTML = (html) => {
    const frameId = 'erp-print-frame';
    let frame = document.getElementById(frameId);

    if (!frame) {
        frame = document.createElement('iframe');
        frame.id = frameId;
        frame.style.position = 'fixed';
        frame.style.bottom = '0';
        frame.style.right = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);
    }

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payslip Print</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { margin: 5mm; }
            </style>
        </head>
        <body>
            ${html}
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    doc.close();
};

window.openPayslipPreview = (record) => {
    const contextCompany = record.company_id || window.state?.companyId;
    const html = window.generatePayslipHTML(record, contextCompany);

    const overlay = document.createElement('div');
    overlay.className = 'erp-modal-overlay active';
    overlay.style.zIndex = '9999';

    const windowDiv = document.createElement('div');
    windowDiv.className = 'erp-modal-window';
    windowDiv.style.width = '800px';
    windowDiv.style.height = '90%';

    windowDiv.innerHTML = `
        <div class="erp-modal-header">
            <span>Payslip Preview</span>
            <span class="erp-modal-close">X</span>
        </div>
        <div class="erp-modal-body" style="padding:0; overflow:auto; background:#525659;">
            <div style="background:white; margin:20px auto; width:210mm; min-height:297mm; padding:20px; box-shadow:0 0 10px rgba(0,0,0,0.5);">
                ${html}
            </div>
        </div>
        <div class="erp-modal-footer">
            <button class="btn-blue" id="btn-print-slip"><i class="fas fa-print"></i> Print</button>
            <button class="erp-btn" id="btn-pdf-slip"><i class="fas fa-file-pdf"></i> Download PDF</button>
            <button class="erp-btn" id="btn-word-slip"><i class="fas fa-file-word"></i> Download Word</button>
            <button class="btn-gray" id="btn-close-slip">Close</button>
        </div>
    `;

    overlay.appendChild(windowDiv);
    document.body.appendChild(overlay);

    overlay.querySelector('.erp-modal-close').onclick = () => overlay.remove();
    overlay.querySelector('#btn-close-slip').onclick = () => overlay.remove();
    overlay.querySelector('#btn-print-slip').onclick = () => window.printHTML(html);
    overlay.querySelector('#btn-pdf-slip').onclick = () => window.exportPayslipPDF(record);
    overlay.querySelector('#btn-word-slip').onclick = () => window.exportPayslipWord(record);
};

window.exportPayslipWord = (record) => {
    const contextCompany = record.company_id || window.state?.companyId;
    const html = window.generatePayslipHTML(record, contextCompany);
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Payslip</title></head><body>";
    const footer = "</body></html>";
    const source = header + html + footer;

    const blob = new Blob(['\ufeff', source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payslip_${record.first_name}_${record.last_name}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.printAllPayslips = () => {
    const paidRecords = (window.currentPayslipData || []).filter(r => r.status === 'Paid');
    if (paidRecords.length === 0) {
        alert("No saved/paid payslips found to print.");
        return;
    }

    // Context for generatePayslipHTML fallback
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;

    // Generate massive HTML with page breaks
    const allHtml = paidRecords.map((r, i) => {
        const slip = window.generatePayslipHTML(r, contextCompany);
        // Add page break except for last
        const breakStyle = (i < paidRecords.length - 1) ? '<div style="page-break-after:always;"></div>' : '';
        return slip + breakStyle;
    }).join('');

    window.printHTML(allHtml);
};

window.exportPayslipPDF = (record) => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 50;

        const compName = record.company_name || window.state?.companyName || "Company Name";
        const compAddr = record.company_address || "";
        const payPeriod = new Date(record.pay_period_start).toLocaleString('default', { month: 'long', year: 'numeric' });

        const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Centered Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(compName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 18;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(compAddr, pageWidth / 2, y, { align: 'center', maxWidth: 450 });
        y += 25;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Salary Slip for the month of ${payPeriod}`, pageWidth / 2, y, { align: 'center' });
        y += 30;

        // Employee Details (2 columns)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const leftX = 40;
        const midX = pageWidth / 2;
        const labelW = 80;

        const details = [
            ['Emp ID:', `${record.employee_code || record.employee_id || record.id}`, 'Employee Name:', `${record.first_name} ${record.last_name}`],
            ['Pay Days:', `${record.days_present !== undefined ? record.days_present : '30'}`, 'Present Days:', `${record.days_present !== undefined ? record.days_present : '30'}`],
            ['DOJ:', `${record.date_of_joining || '-'}`, 'Father Name:', `${record.father_name || record.father || '-'}`]
        ];

        details.forEach(row => {
            doc.text(row[0], leftX, y);
            doc.text(row[1], leftX + labelW, y);
            doc.text(row[2], midX, y);
            doc.text(row[3], midX + labelW, y);
            y += 15;
        });

        y += 10;

        // Main Table (5 columns)
        const earnings = [
            { l: 'BASIC', v: record.basic_salary, r: record.base_salary },
            { l: 'DA', v: record.da, r: record.da_rate },
            { l: 'HRA', v: record.hra, r: record.hra_rate },
            { l: 'CONVEYANCE', v: record.conveyance, r: record.conveyance_allowance },
            { l: 'MEDICAL', v: record.medical, r: record.medical_allowance },
            { l: 'SPECIAL', v: record.special_allowance, r: record.special_allowance_fixed },
            { l: 'BONUS', v: record.bonuses, r: record.bonuses },
            { l: 'OT AMOUNT', v: record.ot_amount || 0, r: null }
        ].filter(e => e.v > 0 || (e.r > 0 && e.l !== 'OT AMOUNT'));

        const deductions = [
            { l: 'ADVANCE', v: record.other_deductions || 0 },
            { l: 'PF', v: record.employee_pf || record.pf || 0 },
            { l: 'ESI', v: record.employee_esi || record.esi || 0 },
            { l: 'PT', v: record.professional_tax || record.pt || 0 },
            { l: 'TDS', v: record.tds || 0 },
            { l: 'LOP', v: record.lop_amount || 0 }
        ].filter(d => d.v > 0);

        let totalRate = 0;
        const tableBody = [];
        for (let i = 0; i < Math.max(earnings.length, deductions.length); i++) {
            const e = earnings[i] || { l: '', v: null, r: null };
            const d = deductions[i] || { l: '', v: null };
            tableBody.push([
                e.l,
                e.v ? fmt(e.r || e.v) : '',
                e.v ? fmt(e.v) : '',
                d.l,
                d.v ? fmt(d.v) : ''
            ]);
            if (e.r) totalRate += parseFloat(e.r);
        }
        // Total row
        tableBody.push([
            'Total',
            fmt(totalRate),
            fmt(record.gross_salary),
            'Total',
            fmt(record.total_deductions)
        ]);

        doc.autoTable({
            startY: y,
            margin: { left: 40, right: 40 },
            head: [['Earnings', 'Rate', 'Amount', 'Deductions', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 1, lineColor: [0,0,0] },
            styles: { fontSize: 9, cellPadding: 5, textColor: [0, 0, 0], lineWidth: 1, lineColor: [0,0,0] },
            columnStyles: {
                0: { cellWidth: 120 },
                1: { cellWidth: 80, halign: 'right' },
                2: { cellWidth: 80, halign: 'right' },
                3: { cellWidth: 120 },
                4: { cellWidth: 114, halign: 'right' }
            },
            didParseCell: function(data) {
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        y = doc.lastAutoTable.finalY + 20;

        // Summary
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Net Pay: ${fmt(record.net_salary)}`, 40, y);
        y += 15;
        doc.text(`In Words: ${window.convertNumberToWords(Math.round(record.net_salary || 0))}`, 40, y);

        y += 40;
        // Signature
        doc.text("Signature", pageWidth - 100, y, { align: 'center' });
        
        y += 25;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("This is Computer Generated Statement, Does not Required Signature", pageWidth / 2, y, { align: 'center' });

        doc.save(`Payslip_${record.first_name}_${record.last_name}.pdf`);
    } catch (e) {
        console.error("PDF generation failed:", e);
        alert("Failed to generate PDF. Error: " + e.message);
    }
};

window.generatePayslipHTML = (r, companyId) => {
    const compName = r.company_name || window.state?.companyName || "Company Name";
    const compAddr = r.company_address || "";
    const compLogo = r.company_logo || "";

    const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const payPeriod = new Date(r.pay_period_start).toLocaleString('default', { month: 'short', year: 'numeric' });

    // Design tokens based on reference image
    const style = {
        container: "font-family: Arial, sans-serif; color: #000; max-width: 800px; margin: 0 auto; background: white; padding: 20px; border: 1px solid #ccc;",
        header: "text-align: center; margin-bottom: 20px;",
        compTitle: "margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;",
        compAddr: "margin: 2px 0; font-size: 12px; font-weight: bold;",
        slipTitle: "margin: 10px 0; font-size: 14px; font-weight: bold;",
        empDetails: "width: 100%; margin-bottom: 15px; font-size: 11px;",
        empDetailsTd: "padding: 2px 5px; vertical-align: top;",
        label: "width: 100px; display: inline-block;",
        mainTable: "width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;",
        th: "border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;",
        td: "border: 1px solid #000; padding: 4px 8px; vertical-align: top;",
        tdRight: "border: 1px solid #000; padding: 4px 8px; vertical-align: top; text-align: right;",
        totalRow: "font-weight: bold;",
        summaryBox: "margin-top: 10px; font-size: 12px;",
        summaryRow: "display: flex; justify-content: space-between; padding: 2px 0;",
        footer: "margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px;",
        disclaimer: "text-align: center; font-size: 10px; margin-top: 15px; font-weight: bold;"
    };

        const earnings = [
        { l: 'BASIC', v: r.basic_salary, r: r.base_salary },
        { l: 'DA', v: r.da, r: r.da_rate },
        { l: 'HRA', v: r.hra, r: r.hra_rate },
        { l: 'CONVEYANCE', v: r.conveyance, r: r.conveyance_allowance },
        { l: 'MEDICAL', v: r.medical, r: r.medical_allowance },
        { l: 'SPECIAL', v: r.special_allowance, r: r.special_allowance_fixed },
        { l: 'BONUS', v: r.bonuses, r: r.bonuses },
        { l: 'OT AMOUNT', v: r.ot_amount || 0, r: null }
    ].filter(e => e.v > 0 || (e.r > 0 && e.l !== 'OT AMOUNT'));

    const deductions = [
        { l: 'ADVANCE', v: r.other_deductions || 0 },
        { l: 'PF', v: r.employee_pf || r.pf || 0 },
        { l: 'ESI', v: r.employee_esi || r.esi || 0 },
        { l: 'PT', v: r.professional_tax || r.pt || 0 },
        { l: 'TDS', v: r.tds || 0 },
        { l: 'LOP', v: r.lop_amount || 0 }
    ].filter(d => d.v > 0);

    const maxRows = Math.max(earnings.length, deductions.length);
    let rowsHtml = '';
    let totalRate = 0;
    for (let i = 0; i < maxRows; i++) {
        const e = earnings[i] || { l: '', v: null, r: null };
        const d = deductions[i] || { l: '', v: null };
        rowsHtml += `
            <tr>
                <td style="${style.td}">${e.l}</td>
                <td style="${style.tdRight}">${e.v ? fmt(e.r || e.v) : ''}</td>
                <td style="${style.tdRight}">${e.v ? fmt(e.v) : ''}</td>
                <td style="${style.td}">${d.l}</td>
                <td style="${style.tdRight}">${d.v ? fmt(d.v) : ''}</td>
            </tr>
        `;
        if (e.r) totalRate += parseFloat(e.r);
    }

    return `
        <div style="${style.container}">
            <div style="${style.header}">
                <h1 style="${style.compTitle}">${escapeHtml(compName)}</h1>
                <p style="${style.compAddr}">${escapeHtml(compAddr)}</p>
                <h2 style="${style.slipTitle}">Salary Slip for the month of ${payPeriod}</h2>
            </div>

            <table style="${style.empDetails}">
                <tr>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">Emp ID</span>: ${r.employee_code || r.employee_id || r.id}</td>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">Employee Name</span>: ${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</td>
                </tr>
                <tr>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">Pay Days</span>: ${r.days_present !== undefined ? r.days_present : '30'}</td>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">Present Days</span>: ${r.days_present !== undefined ? r.days_present : '30'}</td>
                </tr>
                <tr>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">DOJ</span>: ${r.date_of_joining || '-'}</td>
                    <td style="${style.empDetailsTd}"><span style="${style.label}">Father Name</span>: ${r.father_name || r.father || '-'}</td>
                </tr>
            </table>

            <table style="${style.mainTable}">
                <thead>
                    <tr>
                        <th style="${style.th}">Earnings</th>
                        <th style="${style.th}">Rate</th>
                        <th style="${style.th}">Amount</th>
                        <th style="${style.th}">Deductions</th>
                        <th style="${style.th}">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="${style.totalRow}">
                        <td style="${style.td}">Total</td>
                        <td style="${style.tdRight}">${fmt(totalRate)}</td>
                        <td style="${style.tdRight}">${fmt(r.gross_salary)}</td>
                        <td style="${style.td}">Total</td>
                        <td style="${style.tdRight}">${fmt(r.total_deductions)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="${style.summaryBox}">
                <div style="${style.summaryRow}">
                    <span><strong>Net Pay</strong>: ${fmt(r.net_salary)}</span>
                </div>
                <div style="${style.summaryRow}">
                    <span><strong>In Words</strong>: ${window.convertNumberToWords(Math.round(r.net_salary || 0))}</span>
                </div>
            </div>

            <div style="${style.footer}">
                <div></div>
                <div style="text-align: right; margin-right: 20px;">
                    <br/><br/>
                    <strong>Signature</strong>
                </div>
            </div>

            <p style="${style.disclaimer}">This is Computer Generated Statement, Does not Required Signature</p>
        </div>
    `;
};

window.convertNumberToWords = (amount) => {
    var a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return; var str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str;
    }
    if (amount === 0) return "Zero";
    return (inWords(amount) + "Only").trim();
};


export async function loadPayslips() {
    const contentArea = document.getElementById('content-area');
    // ... existing init code ...
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    // Context
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;
    const contextYear = document.getElementById('ctx-year')?.value || '2025-2026';
    const contextMonth = document.getElementById('ctx-month')?.value || '4';

    if (!contextCompany || contextCompany === 'Loading...') {
        contentArea.innerHTML = '<div style="padding:20px;"><h3>Please select a Company.</h3></div>';
        return;
    }

    const m = parseInt(contextMonth);
    const monthName = new Date(new Date().getFullYear(), m - 1, 1).toLocaleString('default', { month: 'long' });

    // UI Structure
    contentArea.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; font-family:'Segoe UI', sans-serif; background:#f8fafc;">
            <div style="padding:15px 24px; background:white; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; background:#eff6ff; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#3b82f6; font-size:16px;">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:16px; color:#0f172a; font-weight:700;">Payslips</h2>
                        <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">Period: <span style="font-weight:600; color:#334155;">${monthName} ${contextYear}</span></p>
                    </div>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                     <button class="native-btn erp-tooltip" data-tip="Open Bulk Export Wizard" onclick="openBulkExportWizard()" style="color:#059669; border-color:#d1fae5; background:#ecfdf5;">
                        <i class="fas fa-magic" style="margin-right:8px;"></i> Bulk Export Wizard
                     </button>
                     <button class="native-btn erp-tooltip" data-tip="Download Selected (Bulk)" onclick="downloadSelectedPayslips()" id="bulk-download-btn" style="display:none; color:#2563eb; border-color:#dbeafe; background:#eff6ff;">
                        <i class="fas fa-file-archive" style="margin-right:8px;"></i> Download Selected
                     </button>
                     <button class="native-btn erp-tooltip" data-tip="Print All Payslips" onclick="printAllPayslips()">
                        <i class="fas fa-print"></i>
                     </button>
                </div>
            </div>
            
            <div style="flex:1; overflow:auto; padding:24px;">
                <div style="background:white; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05); overflow:hidden;">
                    <table class="native-table">
                        <thead>
                            <tr>
                                <th style="padding-left:24px; width:40px;">
                                    <input type="checkbox" id="select-all-payslips" onclick="toggleSelectAllPayslips(this)">
                                </th>
                                <th>Employee</th>
                                <th>Position</th>
                                <th>Net Pay</th>
                                <th>Status</th>
                                <th style="text-align:center; padding-right:24px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="payslip-list">
                            <tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8; font-style:italic;">Loading payroll data...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div id="print-container" style="display:none;"></div>
            </div>
        </div>

        <style>
            @media print {
                body * { visibility: hidden; }
                #print-container, #print-container * { visibility: visible; }
                #print-container { position: absolute; left: 0; top: 0; width: 100%; display: block !important; background: white; z-index: 9999; }
                /* Hide sidebar/header explicitly if needed */
                .sidebar, .header, .erp-modal-overlay { display: none !important; }
            }

            /* Tooltip */
            .erp-tooltip { position: relative; }
            .erp-tooltip::after {
                content: attr(data-tip);
                position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-5px);
                background: #1e293b; color: white; padding: 5px 10px; font-size: 11px; font-weight:500;
                border-radius: 4px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.2s;
                z-index: 100; visibility: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .erp-tooltip:hover::after { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(-8px); }
            .erp-tooltip::before {
                content: ''; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(0);
                border: 5px solid transparent; border-top-color: #1e293b; opacity: 0; visibility: hidden;
                transition: all 0.2s; z-index: 100;
            }
            .erp-tooltip:hover::before { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(-3px); }

            .native-btn {
                background:white; border:1px solid #cbd5e1; color:#475569; padding:8px 12px; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s ease-in-out;
            }
            .native-btn:hover { background:#f8fafc; border-color:#94a3b8; color:#0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .native-btn:active { transform:translateY(1px); }

            .native-table { width:100%; border-collapse:collapse; }
            .native-table th { background:#f8fafc; color:#475569; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; padding:14px 16px; text-align:left; border-bottom:1px solid #e2e8f0; }
            .native-table td { padding:14px 16px; border-bottom:1px solid #f1f5f9; color:#334155; font-size:13px; vertical-align:middle; }
            .native-table tr:last-child td { border-bottom:none; }
            .native-table tr:hover td { background:#f8fafc; }

            .emp-avatar { width:32px; height:32px; background:#f1f5f9; color:#475569; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; margin-right:12px; border:1px solid #e2e8f0; }
            .emp-cell { display:flex; align-items:center; }
            .emp-name { font-weight:600; color:#0f172a; }
            .emp-id { font-size:11px; color:#94a3b8; }
            
            .badge { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; border:1px solid transparent; }
            .badge.success { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
            .badge.warning { background:#fef9c3; color:#854d0e; border-color:#fde047; }

            .action-group { display:flex; align-items:center; justify-content:center; gap:8px; }
            .action-icon-btn { 
                width:32px; height:32px; border-radius:6px; border:1px solid transparent; background:transparent; 
                color:#64748b; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; 
            }
            .action-icon-btn:hover { background:white; border-color:#e2e8f0; color:#0f172a; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
            .action-icon-btn.view:hover { color:#2563eb; background:#eff6ff; border-color:#dbeafe; }
            .action-icon-btn.word:hover { color:#0f766e; background:#f0fdfa; border-color:#ccfbf1; }
        </style>
    `;

    // Fetch Data
    try {
        const startYear = parseInt(contextYear.split('-')[0]);
        let queryYear = startYear;
        if (parseInt(contextMonth) <= 3) queryYear = startYear + 1;

        const res = await window.electronAPI.getPayroll({
            month: parseInt(contextMonth),
            year: queryYear,
            companyId: contextCompany
        });

        const rows = Array.isArray(res) ? res : (res.data || []);
        window.currentPayslipData = rows;

        renderPayslipList(rows);
    } catch (e) {
        document.getElementById('payslip-list').innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#ef4444;">Error loading data: ${e.message}</td></tr>`;
    }

    function renderPayslipList(data) {
        const tbody = document.getElementById('payslip-list');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#64748b;">No payroll records found for this period.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => {
            // Initials for avatar
            const initials = (r.first_name[0] + (r.last_name ? r.last_name[0] : '')).toUpperCase();
            const isPaid = (r.status === 'Paid');

            return `
            <tr data-id="${r.id}">
                <td style="padding-left:24px;">
                    <input type="checkbox" class="payslip-checkbox" value="${r.id}" onclick="updateBulkButtonVisibility()">
                </td>
                <td>
                    <div class="emp-cell">
                        <div class="emp-avatar">${initials}</div>
                        <div>
                            <div class="emp-name">${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</div>
                            <div class="emp-id">#${r.id}</div>
                        </div>
                    </div>
                </td>
                <td><span style="color:#64748b;">${escapeHtml(r.position_title) || '-'}</span></td>
                <td><span style="font-weight:600; color:#0f172a;">₹ ${parseFloat(r.net_salary || 0).toFixed(2)}</span></td>
                <td><span class="badge ${isPaid ? 'success' : 'warning'}">${r.status || 'Pending'}</span></td>
                <td style="text-align:center; padding-right:24px;">
                    <div class="action-group" style="display: ${isPaid ? 'flex' : 'none'};">
                        <button class="action-icon-btn view erp-tooltip" data-tip="Preview Payslip" onclick='openPayslipPreview(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-icon-btn word erp-tooltip" data-tip="Export to Word" onclick='exportPayslipWord(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
                            <i class="fas fa-file-word"></i>
                        </button>
                        <button class="action-icon-btn pdf erp-tooltip" data-tip="Export to PDF" onclick='exportPayslipPDF(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
                            <i class="fas fa-file-pdf" style="color:#dc2626;"></i>
                        </button>
                    </div>
                    ${!isPaid ? '<span style="color:#94a3b8; font-size:11px; font-style:italic;">Save Payroll first</span>' : ''}
                </td>
            </tr>
        `}).join('');
    }

    // Global Handlers
    // Global Handlers


}

window.openBulkExportWizard = () => {
    const contextCompany = window.state?.companyId || document.getElementById('ctx-company')?.value;
    const contextYear = document.getElementById('ctx-year')?.value || '2025-2026';
    showBulkExportWizard(contextCompany, contextYear);
};

// Bulk Selection Helpers
window.toggleSelectAllPayslips = function (el) {
    const checkboxes = document.querySelectorAll('.payslip-checkbox');
    checkboxes.forEach(cb => cb.checked = el.checked);
    updateBulkButtonVisibility();
};

window.updateBulkButtonVisibility = function () {
    const selected = document.querySelectorAll('.payslip-checkbox:checked');
    const btn = document.getElementById('bulk-download-btn');
    if (btn) {
        btn.style.display = selected.length > 0 ? 'flex' : 'none';
        btn.innerHTML = `<i class="fas fa-file-archive" style="margin-right:8px;"></i> Download ${selected.length} Payslip${selected.length > 1 ? 's' : ''}`;
    }
};

window.downloadSelectedPayslips = async function () {
    const selected = Array.from(document.querySelectorAll('.payslip-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selected.length === 0) return;

    try {
        window.showLoader();
        const res = await window.electronAPI.invoke('download-multiple-payslips', { ids: selected });
        window.hideLoader();

        if (res.success) {
            window.showToast("Payslips bundled and saved successfully!", "success");
        } else if (res.error) {
            window.showToast("Download failed: " + res.error, "error");
        }
    } catch (e) {
        window.hideLoader();
        window.showToast("System Error: " + e.message, "error");
    }
};
