const PDFDocument = require('pdfkit');

// Brand palette matching the app's classic-Windows blue theme.
const NAVY = '#103e8f';
const BLUE = '#1a5aa8';
const LIGHT_BLUE = '#eef4fc';
const BORDER = '#c7d3e6';
const TEXT = '#1a1a1a';
const MUTED = '#666666';
const GREEN = '#1a6b1a';
const GREEN_BG = '#e9f7e9';

const PAGE_MARGIN = 40;

function money(n) {
    return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function newDoc() {
    return new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
}

/** Deep-blue header band with the company identity, plus a document-title subtitle bar. */
function drawHeader(doc, company, title, subtitle) {
    const width = doc.page.width;

    doc.rect(0, 0, width, 78).fill(NAVY);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
        .text(company?.name || 'Company Name', PAGE_MARGIN, 18, { width: width - PAGE_MARGIN * 2 });
    doc.font('Helvetica').fontSize(9).fillColor('#cfe0ff')
        .text([company?.address, company?.city, company?.state].filter(Boolean).join(', ') || ' ', PAGE_MARGIN, 42, { width: width - PAGE_MARGIN * 2 });
    if (company?.pan || company?.gstin) {
        doc.fontSize(8).fillColor('#a9c6f5')
            .text([company?.pan && `PAN: ${company.pan}`, company?.gstin && `GSTIN: ${company.gstin}`].filter(Boolean).join('   '), PAGE_MARGIN, 58);
    }

    doc.rect(0, 78, width, 28).fill(BLUE);
    const titleLine = subtitle ? `${title}  •  ${subtitle}` : title;
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
        .text(titleLine, PAGE_MARGIN, 87, { width: width - PAGE_MARGIN * 2, align: 'center' });

    doc.y = 122;
    doc.fillColor(TEXT);
}

/** Bordered key/value info panel — pairs is an array of [label, value], 2 per row. */
function drawInfoPanel(doc, pairs) {
    const startX = PAGE_MARGIN;
    const width = doc.page.width - PAGE_MARGIN * 2;
    const colWidth = width / 2;
    const rowHeight = 18;
    const rows = Math.ceil(pairs.length / 2);
    const panelHeight = rows * rowHeight + 12;
    const startY = doc.y;

    doc.rect(startX, startY, width, panelHeight).fillAndStroke(LIGHT_BLUE, BORDER);

    doc.fontSize(9);
    pairs.forEach(([label, value], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = startX + 10 + col * colWidth;
        const y = startY + 8 + row * rowHeight;
        doc.font('Helvetica-Bold').fillColor(MUTED).text(`${label}:`, x, y, { continued: true, width: colWidth - 20 });
        doc.font('Helvetica').fillColor(TEXT).text(` ${value ?? '-'}`);
    });

    doc.y = startY + panelHeight + 14;
}

/**
 * Bordered data table with a colored header row and right-aligned numeric columns.
 * columns: [{ label, width, align }]; rows: array of arrays matching column order.
 */
function drawTable(doc, columns, rows, { zebra = true } = {}) {
    const startX = PAGE_MARGIN;
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);
    let y = doc.y;
    const headerHeight = 22;
    const rowHeight = 20;

    doc.rect(startX, y, totalWidth, headerHeight).fill(BLUE);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    let x = startX;
    columns.forEach((col) => {
        doc.text(col.label, x + 6, y + 6, { width: col.width - 12, align: col.align || 'left' });
        x += col.width;
    });
    y += headerHeight;

    doc.font('Helvetica').fontSize(9);
    rows.forEach((row, i) => {
        if (zebra && i % 2 === 1) doc.rect(startX, y, totalWidth, rowHeight).fill('#f5f8fd');
        doc.fillColor(TEXT);
        x = startX;
        row.forEach((cell, ci) => {
            const col = columns[ci];
            doc.text(String(cell), x + 6, y + 5, { width: col.width - 12, align: col.align || 'left' });
            x += col.width;
        });
        y += rowHeight;
    });

    doc.rect(startX, doc.y, totalWidth, y - doc.y).stroke(BORDER);
    x = startX;
    columns.forEach((col) => {
        doc.moveTo(x, doc.y).lineTo(x, y).stroke(BORDER);
        x += col.width;
    });
    doc.moveTo(x, doc.y).lineTo(x, y).stroke(BORDER);

    doc.y = y + 12;
}

/** Highlighted total/summary box (used for Net Pay, Total Tax, etc.). */
function drawHighlightBox(doc, label, value, { color = GREEN, bg = GREEN_BG } = {}) {
    const startX = PAGE_MARGIN;
    const width = doc.page.width - PAGE_MARGIN * 2;
    const y = doc.y;
    const height = 34;

    doc.roundedRect(startX, y, width, height, 4).fillAndStroke(bg, color);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(color)
        .text(label, startX + 14, y + 10, { continued: true, width: width - 160 });
    doc.fontSize(14).text(`Rs. ${value}`, { align: 'right', width: width - 42 });

    doc.y = y + height + 12;
    doc.fillColor(TEXT);
}

// Flows immediately after the content (not pinned to an absolute page-bottom coordinate)
// — pdfkit auto-paginates when an explicit y lands near a page boundary, and chaining two
// more explicit-y .text() calls after that compounds into a cascade of near-blank pages.
// Letting it flow naturally with the current cursor avoids that entirely.
function drawFooter(doc, note) {
    const width = doc.page.width - PAGE_MARGIN * 2;
    doc.moveDown(2);
    const lineY = doc.y;
    doc.moveTo(PAGE_MARGIN, lineY).lineTo(doc.page.width - PAGE_MARGIN, lineY).stroke(BORDER);
    doc.y = lineY + 8;
    doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
        .text(note, PAGE_MARGIN, doc.y, { width, align: 'center' });
    doc.moveDown(0.3);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, PAGE_MARGIN, doc.y, { width, align: 'center' });
}

function streamPayslip(res, { payroll, employee, company }) {
    const doc = newDoc();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payslip_${employee.first_name}_${employee.last_name}_${payroll.pay_period_start}.pdf"`);
    doc.pipe(res);

    const periodLabel = new Date(payroll.pay_period_start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    drawHeader(doc, company, 'PAYSLIP', periodLabel);

    drawInfoPanel(doc, [
        ['Employee', `${employee.first_name} ${employee.last_name}`],
        ['Employee Code', employee.employee_code || `EMP-${employee.id}`],
        ['Designation', employee.position_title || '-'],
        ['Department', employee.department_name || '-'],
        ['PAN', employee.pan_number || '-'],
        ['Bank A/c No.', employee.account_number || '-'],
        ['UAN', employee.uan || '-'],
        ['Payment Mode', employee.payment_mode || 'Bank'],
    ]);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Earnings', PAGE_MARGIN, doc.y);
    doc.y += 4;
    const earnCols = [{ label: 'Component', width: 340 }, { label: 'Amount (Rs.)', width: 135, align: 'right' }];
    drawTable(doc, earnCols, [
        ['Basic', money(payroll.basic_salary)],
        ['DA', money(payroll.da)],
        ['HRA', money(payroll.hra)],
        ['Conveyance', money(payroll.conveyance)],
        ['Medical', money(payroll.medical)],
        ['Special Allowance', money(payroll.special_allowance)],
        ['Bonus', money(payroll.bonuses)],
    ], { zebra: true });

    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Deductions', PAGE_MARGIN, doc.y);
    doc.y += 4;
    drawTable(doc, earnCols, [
        ['Provident Fund (PF)', money(payroll.employee_pf)],
        ['Voluntary PF (VPF)', money(payroll.vpf_amount)],
        ['ESI', money(payroll.employee_esi)],
        ['Professional Tax', money(payroll.professional_tax)],
        ['TDS', money(payroll.tds)],
        ['Loan EMI', money(payroll.loan_deduction)],
        ['Loss of Pay', money(payroll.lop_amount)],
        ['Other Deductions', money(payroll.other_deductions)],
    ], { zebra: true });

    const w = (doc.page.width - PAGE_MARGIN * 2 - 12) / 2;
    const y0 = doc.y;
    doc.roundedRect(PAGE_MARGIN, y0, w, 30, 4).fillAndStroke('#f5f8fd', BORDER);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Gross Earnings', PAGE_MARGIN + 12, y0 + 9, { continued: true, width: w - 100 });
    doc.font('Helvetica-Bold').fontSize(11).text(`Rs. ${money(payroll.gross_salary)}`, { align: 'right', width: w - 24 });

    doc.roundedRect(PAGE_MARGIN + w + 12, y0, w, 30, 4).fillAndStroke('#fdf3f3', '#e8c6c6');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#a02525').text('Total Deductions', PAGE_MARGIN + w + 24, y0 + 9, { continued: true, width: w - 100 });
    doc.font('Helvetica-Bold').fontSize(11).text(`Rs. ${money(payroll.total_deductions)}`, { align: 'right', width: w - 24 });

    doc.y = y0 + 42;
    drawHighlightBox(doc, 'NET PAY', money(payroll.net_salary));

    drawFooter(doc, 'This is a system-generated payslip and does not require a physical signature.');
    doc.end();
}

function streamForm16(res, { employee, company, financialYear, annual }) {
    const doc = newDoc();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Form16_${employee.first_name}_${employee.last_name}_${financialYear}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, company, 'FORM 16 — PART B ANNEXURE', `Financial Year ${financialYear}`);

    drawInfoPanel(doc, [
        ['Employee Name', `${employee.first_name} ${employee.last_name}`],
        ['PAN', employee.pan_number || '-'],
        ['Employer', company?.name || '-'],
        ['TAN', company?.tan || '-'],
    ]);

    const cols = [{ label: 'Component', width: 340 }, { label: 'Amount (Rs.)', width: 135, align: 'right' }];

    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Salary Details', PAGE_MARGIN, doc.y);
    doc.y += 4;
    drawTable(doc, cols, [
        ['Gross Salary u/s 17(1)', money(annual.gross_income)],
        ['Basic', money(annual.annual_basic)],
        ['HRA', money(annual.annual_hra)],
        ['DA', money(annual.annual_da)],
        ['Other Allowances', money(annual.annual_allowances)],
    ]);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Deductions', PAGE_MARGIN, doc.y);
    doc.y += 4;
    drawTable(doc, cols, [
        ['Provident Fund (u/s 80C)', money(annual.annual_pf)],
        ['Professional Tax', money(annual.annual_pt)],
        ['Other Chapter VI-A Deductions (declared)', money(annual.declared_deductions || 0)],
    ]);

    drawHighlightBox(doc, 'TOTAL TDS DEDUCTED', money(annual.annual_tds), { color: NAVY, bg: LIGHT_BLUE });
    drawHighlightBox(doc, 'NET SALARY PAID', money(annual.net_salary));

    drawFooter(doc, 'This annexure summarizes salary/TDS as recorded in the payroll system for the financial year. It is not a substitute for the official Form 16 (Part A + B) issued via the TRACES portal.');
    doc.end();
}

function streamForm12Ba(res, { employee, company, financialYear, perquisites }) {
    const doc = newDoc();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Form12BA_${employee.first_name}_${employee.last_name}_${financialYear}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, company, 'FORM 12BA', `Statement of Perquisites — FY ${financialYear}`);

    drawInfoPanel(doc, [
        ['Employee Name', `${employee.first_name} ${employee.last_name}`],
        ['PAN', employee.pan_number || '-'],
        ['Designation', employee.position_title || '-'],
        ['Employer', company?.name || '-'],
        ['TAN', company?.tan || '-'],
        ['Employer PAN', company?.pan || '-'],
    ]);

    const cols = [
        { label: 'Nature of Perquisite', width: 195 },
        { label: 'Value as per Rules (Rs.)', width: 110, align: 'right' },
        { label: 'Amount Recovered (Rs.)', width: 110, align: 'right' },
        { label: 'Taxable Value (Rs.)', width: 60, align: 'right' },
    ];

    let totalTaxable = 0;
    const rows = perquisites.map((p) => {
        const value = Number(p.value);
        const recovered = Number(p.amount_recovered || 0);
        const taxable = Math.max(0, value - recovered);
        totalTaxable += taxable;
        return [`${p.perquisite_type}${p.description ? ` — ${p.description}` : ''}`, money(value), money(recovered), money(taxable)];
    });

    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Perquisites Detail', PAGE_MARGIN, doc.y);
    doc.y += 4;
    drawTable(doc, cols, rows);

    drawHighlightBox(doc, 'TOTAL TAXABLE VALUE OF PERQUISITES', money(totalTaxable));

    drawFooter(doc, 'Perquisite values are as declared by the employer per Income Tax Rule 3 — this annexure is not a substitute for the official Form 12BA issued alongside Form 16.');
    doc.end();
}

function streamLetter(res, { title, content, employee, company }) {
    const doc = newDoc();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${title.replace(/\s+/g, '_')}_${employee.first_name}_${employee.last_name}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, company, title.toUpperCase());

    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), { align: 'right' });
    doc.moveDown(1);

    doc.font('Helvetica').fontSize(10.5).fillColor(TEXT).text(content, { align: 'left', lineGap: 5 });

    drawFooter(doc, `${company?.name || 'Company'} — This letter is issued electronically and is valid without a physical signature.`);
    doc.end();
}

module.exports = { streamPayslip, streamForm16, streamForm12Ba, streamLetter };
