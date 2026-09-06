const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { LWF_RATES } = require('../utils/lwf');
const { todayLocal } = require('../utils/dateUtils');

function monthBounds(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
}

function toCsv(header, rows) {
    return [header, ...rows].join('\r\n');
}

function quarterRange(financialYear, quarter) {
    const [y1] = (financialYear || '').split('-').map((s) => parseInt(s, 10));
    if (!y1) throw ApiError.badRequest('financialYear must look like "2025-2026"');
    const ranges = {
        Q1: [`${y1}-04-01`, `${y1}-06-30`],
        Q2: [`${y1}-07-01`, `${y1}-09-30`],
        Q3: [`${y1}-10-01`, `${y1}-12-31`],
        Q4: [`${y1 + 1}-01-01`, `${y1 + 1}-03-31`],
    };
    const range = ranges[quarter];
    if (!range) throw ApiError.badRequest('quarter must be one of Q1, Q2, Q3, Q4');
    return range;
}

// Maps a day's attendance/holiday/leave data down to a single muster-roll code.
// Priority: explicit attendance record > company holiday > approved leave > Sunday
// (assumed weekly off, since there's no per-company weekly-off-day setting yet) > Absent
// (no record at all is treated as absent, the standard statutory-register assumption).
const ATTENDANCE_CODE = { Present: 'P', Absent: 'A', 'Half-Day': 'HD', Late: 'P', 'On Leave': 'L' };

async function buildMusterRoll({ companyId, year, month }) {
    year = parseInt(year, 10);
    month = parseInt(month, 10);
    if (!companyId || !year || !month || month < 1 || month > 12) {
        throw ApiError.badRequest('companyId, a valid year and month (1-12) are required');
    }
    const { start, end } = monthBounds(year, month);
    const totalDays = new Date(year, month, 0).getDate();

    const employees = await db.all(
        `SELECT id, employee_code, first_name, last_name, date_of_joining, exit_date
         FROM employees WHERE company_id = ?
           AND (date_of_joining IS NULL OR date_of_joining <= ?)
           AND (exit_date IS NULL OR exit_date >= ?)
         ORDER BY employee_code, first_name`,
        [companyId, end, start]
    );
    if (employees.length === 0) throw ApiError.notFound('No employees were active during this period');

    const attendance = await db.all(
        `SELECT a.employee_id, a.date, a.status FROM attendance a
         JOIN employees e ON a.employee_id = e.id
         WHERE e.company_id = ? AND a.date BETWEEN ? AND ?`,
        [companyId, start, end]
    );
    const attByEmpDate = new Map(attendance.map((a) => [`${a.employee_id}|${a.date}`, a.status]));

    const holidays = await db.all('SELECT date, name FROM holidays WHERE company_id = ? AND date BETWEEN ? AND ?', [companyId, start, end]);
    const holidayDates = new Map(holidays.map((h) => [h.date, h.name]));

    const leaves = await db.all(
        `SELECT l.employee_id, l.start_date, l.end_date FROM leaves l
         JOIN employees e ON l.employee_id = e.id
         WHERE e.company_id = ? AND l.status = 'Approved' AND l.start_date <= ? AND l.end_date >= ?`,
        [companyId, end, start]
    );

    function dayCode(emp, dateStr, dayOfWeek) {
        if (dateStr < emp.date_of_joining || (emp.exit_date && dateStr > emp.exit_date)) return '';
        const status = attByEmpDate.get(`${emp.id}|${dateStr}`);
        if (status) return ATTENDANCE_CODE[status] || 'P';
        if (holidayDates.has(dateStr)) return 'H';
        if (leaves.some((l) => l.employee_id === emp.id && l.start_date <= dateStr && l.end_date >= dateStr)) return 'L';
        if (dayOfWeek === 0) return 'WO';
        return 'A';
    }

    const rows = employees.map((emp) => {
        const days = [];
        const summary = { P: 0, A: 0, HD: 0, L: 0, H: 0, WO: 0 };
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            const code = dayCode(emp, dateStr, dayOfWeek);
            days.push(code);
            if (code && summary[code] !== undefined) summary[code]++;
        }
        return {
            employeeId: emp.id, employeeCode: emp.employee_code,
            name: `${emp.first_name} ${emp.last_name}`,
            days, summary,
        };
    });

    return { year, month, totalDays, holidays, rows };
}

module.exports = {
    // On-screen muster-roll grid (JSON) — day-by-day P/A/HD/L/H/WO code per employee for the
    // month, with per-employee summary totals. Days with an explicit attendance record win;
    // otherwise falls back to company holidays, then approved leave, then Sunday as a weekly
    // off, and finally Absent for a genuinely unmarked working day.
    async generateMusterRollData({ companyId, year, month }) {
        return buildMusterRoll({ companyId, year, month });
    },

    // Same data as a downloadable CSV register (Employee Code, Name, day 1..N, then totals).
    async generateMusterRoll({ companyId, year, month }) {
        const { totalDays, rows } = await buildMusterRoll({ companyId, year, month });
        const dayHeaders = Array.from({ length: totalDays }, (_, i) => i + 1).join(',');
        const header = `Employee Code,Name,${dayHeaders},Present,Absent,Half-Day,Leave,Holiday,Weekly Off`;
        const lines = rows.map((r) =>
            [r.employeeCode || '', `"${r.name}"`, ...r.days, r.summary.P, r.summary.A, r.summary.HD, r.summary.L, r.summary.H, r.summary.WO].join(',')
        );
        return { filename: `Muster_Roll_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    /**
     * EPFO ECR (Electronic Challan cum Return) text file — the '#~#' delimited format
     * EPFO's unified portal accepts for monthly PF filing. One line per employee:
     * UAN#~#Name#~#GrossWages#~#EPFWages#~#EPSWages#~#EDLIWages#~#EPFContri#~#EPSContri#~#EPFEPSDiff#~#NCPDays#~#Refund
     */
    async generatePfEcr({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);

        const rows = await db.all(
            `SELECT e.uan, e.first_name, e.last_name, p.basic_salary, p.da, p.employee_pf, p.employer_pf, p.employer_eps
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ? AND e.is_pf_enabled = 1
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No PF-enrolled payroll records found for this period');

        const lines = rows.map((r) => {
            const uan = r.uan || '000000000000';
            const name = `${r.first_name} ${r.last_name}`.toUpperCase();
            const epfWages = Math.round(Number(r.basic_salary) + Number(r.da));
            const grossWages = epfWages;
            const epsWages = Math.min(epfWages, 15000);
            const edliWages = epsWages;
            const epfContri = Math.round(Number(r.employer_pf));
            const epsContri = Math.round(Number(r.employer_eps));
            const epfEpsDiff = Math.max(0, epfContri - epsContri);
            return [uan, name, grossWages, epfWages, epsWages, edliWages, epfContri, epsContri, epfEpsDiff, 0, 0].join('#~#');
        });

        return { filename: `PF_ECR_${year}_${String(month).padStart(2, '0')}.txt`, content: lines.join('\r\n') };
    },

    /**
     * ESIC monthly contribution file — simplified CSV (IP Number, Name, Days Worked,
     * Wages, Employee Contribution, Employer Contribution). ESIC's portal-native upload
     * format is a fixed-width text file with additional branch-office metadata; this CSV
     * carries the same figures for manual entry / adaptation rather than direct upload.
     */
    async generateEsiReturn({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);

        const rows = await db.all(
            `SELECT e.esi_number, e.first_name, e.last_name, p.gross_salary, p.employee_esi, p.employer_esi
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ? AND e.is_esi_enabled = 1
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No ESI-enrolled payroll records found for this period');

        const header = 'IP Number,IP Name,Total Monthly Wages,Employee Contribution,Employer Contribution';
        const lines = rows.map((r) =>
            [r.esi_number || '', `"${r.first_name} ${r.last_name}"`, Number(r.gross_salary).toFixed(2), Number(r.employee_esi).toFixed(2), Number(r.employer_esi).toFixed(2)].join(',')
        );

        return { filename: `ESI_Return_${year}_${String(month).padStart(2, '0')}.csv`, content: [header, ...lines].join('\r\n') };
    },

    // Professional Tax register for the month — what was actually deducted per employee
    // (state-wise slabs when the company's state is mapped; see utils/professionalTax.js).
    async generatePtRegister({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);

        const rows = await db.all(
            `SELECT e.first_name, e.last_name, e.employee_code, c.state, p.professional_tax
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             LEFT JOIN companies c ON e.company_id = c.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ? AND p.professional_tax > 0
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No PT-deducted payroll records found for this period');

        const header = 'Employee Code,Name,State,PT Deducted';
        const lines = rows.map((r) =>
            [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.state || '', Number(r.professional_tax).toFixed(2)].join(',')
        );
        return { filename: `PT_Register_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // Labour Welfare Fund register — what's due for the company's state and period, per
    // active employee. LWF's filing cadence varies by state (see utils/lwf.js); this always
    // shows the per-period contribution due for that state's rate, independent of payroll.
    async generateLwfRegister({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');

        const company = await db.get('SELECT name, state FROM companies WHERE id = ?', [companyId]);
        if (!company) throw ApiError.notFound('Company not found');
        const rate = LWF_RATES[company.state];
        if (!rate) throw ApiError.badRequest(`No LWF rate is mapped for state "${company.state || '(not set)'}" — set the company's state under Company Details, or check utils/lwf.js.`);

        const employees = await db.all(
            "SELECT first_name, last_name, employee_code FROM employees WHERE company_id = ? AND status = 'Active' ORDER BY first_name",
            [companyId]
        );
        if (employees.length === 0) throw ApiError.notFound('No active employees found for this company');

        const header = 'Employee Code,Name,Employee Contribution,Employer Contribution,Frequency';
        const lines = employees.map((e) =>
            [e.employee_code || '', `"${e.first_name} ${e.last_name}"`, rate.employee.toFixed(2), rate.employer.toFixed(2), rate.frequency].join(',')
        );
        return { filename: `LWF_Register_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // Statutory Bonus register (Payment of Bonus Act, 1965) for a financial year — eligible
    // employees are those whose average monthly gross over the FY is within the wage
    // ceiling; the bonus itself is computed on basic+DA capped at the calculation ceiling.
    async generateBonusRegister({ companyId, financialYear, bonusPercent = 8.33 }) {
        if (!companyId || !financialYear) throw ApiError.badRequest('companyId and financialYear are required');
        const [y1] = financialYear.split('-').map((s) => parseInt(s, 10));
        if (!y1) throw ApiError.badRequest('financialYear must look like "2025-2026"');
        const start = `${y1}-04-01`;
        const end = `${y1 + 1}-03-31`;

        const WAGE_CEILING = 21000; // eligibility: avg monthly gross must not exceed this
        const CALC_CEILING = 7000; // bonus is calculated on min(basic+DA, this)

        const rows = await db.all(
            `SELECT e.id, e.first_name, e.last_name, e.employee_code,
                    AVG(p.gross_salary) as avg_gross, AVG(p.basic_salary + p.da) as avg_basic_da,
                    COUNT(*) as months_paid
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
             GROUP BY e.id`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No payroll records found for this financial year');

        const eligible = rows.filter((r) => Number(r.avg_gross) <= WAGE_CEILING);
        if (eligible.length === 0) throw ApiError.notFound(`No employees fall within the ₹${WAGE_CEILING} wage-ceiling eligibility for this financial year`);

        const header = 'Employee Code,Name,Months Paid,Avg Basic+DA,Calc Basis,Bonus %,Annual Bonus';
        const lines = eligible.map((r) => {
            const calcBasis = Math.min(Number(r.avg_basic_da), CALC_CEILING);
            const annualBonus = Math.round(calcBasis * 12 * (Number(bonusPercent) / 100));
            return [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.months_paid, Number(r.avg_basic_da).toFixed(2), calcBasis.toFixed(2), bonusPercent, annualBonus].join(',');
        });
        return { filename: `Bonus_Register_${financialYear}.csv`, content: toCsv(header, lines) };
    },

    // Gratuity register (Payment of Gratuity Act, 1972) — accrued liability as of a given
    // date for every employee with 5+ years of service. Gratuity = 15 * last drawn
    // (Basic+DA) * years of service / 26. "Last drawn" uses the employee's current salary
    // fields as the best available proxy for exited employees too (payroll history for
    // basic/DA is available, but this keeps the calculation consistent for active staff).
    async generateGratuityRegister({ companyId, asOfDate }) {
        if (!companyId) throw ApiError.badRequest('companyId is required');
        const asOf = asOfDate || todayLocal();

        const employees = await db.all(
            `SELECT id, first_name, last_name, employee_code, date_of_joining, exit_date, base_salary, da_rate, status
             FROM employees WHERE company_id = ? AND date_of_joining IS NOT NULL`,
            [companyId]
        );

        const rows = employees.map((e) => {
            const start = new Date(e.date_of_joining);
            const end = new Date(e.exit_date || asOf);
            let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            if (end.getDate() < start.getDate()) totalMonths -= 1;
            const years = Math.floor(totalMonths / 12) + ((totalMonths % 12) >= 6 ? 1 : 0);
            const lastBasicDa = (Number(e.base_salary) || 0) + (Number(e.da_rate) || 0);
            const gratuity = years >= 5 ? Math.round((15 * lastBasicDa * years) / 26) : 0;
            return { ...e, years, gratuity };
        }).filter((r) => r.years >= 5);

        if (rows.length === 0) throw ApiError.notFound('No employees with 5+ years of service found');

        const header = 'Employee Code,Name,Status,Date of Joining,Years of Service,Last Basic+DA,Gratuity Payable';
        const lines = rows.map((r) =>
            [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.status, r.date_of_joining, r.years, ((Number(r.base_salary) || 0) + (Number(r.da_rate) || 0)).toFixed(2), r.gratuity].join(',')
        );
        return { filename: `Gratuity_Register_${asOf}.csv`, content: toCsv(header, lines) };
    },

    // Form 24Q data feeder (plain CSV) — employee-wise TDS deducted per quarter of a
    // financial year. Easier to eyeball/adapt manually than the NSDL-structured file below;
    // kept alongside it since not every use case needs the record-format version.
    async generateForm24Q({ companyId, financialYear, quarter }) {
        if (!companyId || !financialYear || !quarter) throw ApiError.badRequest('companyId, financialYear and quarter are required');
        const [start, end] = quarterRange(financialYear, quarter);

        const rows = await db.all(
            `SELECT e.pan_number, e.first_name, e.last_name, e.employee_code,
                    SUM(p.gross_salary) as total_gross, SUM(p.tds) as total_tds, COUNT(*) as months_paid
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
             GROUP BY e.id
             HAVING total_tds > 0
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No TDS-bearing payroll records found for this quarter');

        const header = 'Employee Code,Name,PAN,Months Paid,Total Gross,Total TDS Deducted';
        const lines = rows.map((r) =>
            [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.pan_number || '', r.months_paid, Number(r.total_gross).toFixed(2), Number(r.total_tds).toFixed(2)].join(',')
        );
        return { filename: `Form24Q_${financialYear}_${quarter}.csv`, content: toCsv(header, lines) };
    },

    // NSDL-structured Form 24Q e-TDS file — mirrors the real record layout (File Header /
    // Batch Header / Challan Detail / Deductee Detail) rather than a flat CSV. Challan
    // details (BSR code, challan serial no, deposit date/amount) come from the deposit
    // receipt the bank issues after the TDS is actually paid — there's no "challan tracking"
    // module here, so they're supplied at generation time, same as how HR actually has them
    // in hand once a quarter. Field layout is a structural approximation of NSDL's e-TDS
    // format for review/adaptation, not guaranteed to pass the File Validation Utility
    // byte-for-byte — same "strong starting point, verify before filing" caveat as PF ECR.
    async generateForm24QNsdl({ companyId, financialYear, quarter, bsrCode, challanNumber, challanDate, challanAmount }) {
        if (!companyId || !financialYear || !quarter) throw ApiError.badRequest('companyId, financialYear and quarter are required');
        if (!bsrCode || !challanNumber || !challanDate || !challanAmount) {
            throw ApiError.badRequest('bsrCode, challanNumber, challanDate and challanAmount are required — from the TDS deposit challan/receipt');
        }
        const [start, end] = quarterRange(financialYear, quarter);

        const company = await db.get('SELECT name, pan, tan FROM companies WHERE id = ?', [companyId]);
        if (!company) throw ApiError.notFound('Company not found');
        if (!company.tan) throw ApiError.badRequest("This company's TAN is not set — add it under Company Details before generating Form 24Q.");

        const rows = await db.all(
            `SELECT e.pan_number, e.first_name, e.last_name,
                    SUM(p.gross_salary) as total_gross, SUM(p.tds) as total_tds
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
             GROUP BY e.id
             HAVING total_tds > 0
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No TDS-bearing payroll records found for this quarter');

        const totalTds = rows.reduce((s, r) => s + Number(r.total_tds), 0);
        const lines = [];
        lines.push(['FH', company.tan, (company.name || '').toUpperCase(), financialYear, quarter, '24Q', 'REGULAR'].join('^'));
        lines.push(['BH', company.tan, company.pan || '', rows.length, 1, totalTds.toFixed(2)].join('^'));
        lines.push(['CD', bsrCode, challanNumber, challanDate, Number(challanAmount).toFixed(2)].join('^'));
        rows.forEach((r) => {
            lines.push(['DD', r.pan_number || 'PANNOTAVBL', `${r.first_name} ${r.last_name}`.toUpperCase(), Number(r.total_gross).toFixed(2), Number(r.total_tds).toFixed(2), 'CD1'].join('^'));
        });

        return { filename: `Form24Q_NSDL_${financialYear}_${quarter}.txt`, content: lines.join('\r\n') };
    },

    // Form 3A — EPFO's annual member-wise PF contribution statement. Real Form 3A is printed
    // as one row per employee with 12 month columns; this is the same figures in a long
    // (one row per employee per month) shape, which is what a CSV/spreadsheet workflow
    // actually wants — plus a trailing TOTAL row per employee, matching the printed form's
    // annual total line.
    async generateForm3A({ companyId, financialYear }) {
        if (!companyId || !financialYear) throw ApiError.badRequest('companyId and financialYear are required');
        const [y1] = financialYear.split('-').map((s) => parseInt(s, 10));
        if (!y1) throw ApiError.badRequest('financialYear must look like "2025-2026"');
        const start = `${y1}-04-01`;
        const end = `${y1 + 1}-03-31`;

        const rows = await db.all(
            `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.uan,
                    p.payment_date, p.basic_salary, p.da, p.employee_pf, p.employer_pf, p.employer_eps
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ? AND e.is_pf_enabled = 1
             ORDER BY e.first_name, p.payment_date`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No PF-enrolled payroll records found for this financial year');

        const header = 'Employee Code,Name,UAN,Month,EPF Wages,Employee PF Contribution,Employer PF Contribution,Employer EPS Contribution';
        const lines = [];
        const byEmployee = new Map();
        for (const r of rows) {
            if (!byEmployee.has(r.id)) byEmployee.set(r.id, []);
            byEmployee.get(r.id).push(r);
        }
        for (const empRows of byEmployee.values()) {
            const totals = { wages: 0, employeePf: 0, employerPf: 0, employerEps: 0 };
            for (const r of empRows) {
                const epfWages = Number(r.basic_salary) + Number(r.da);
                const employeePf = Number(r.employee_pf);
                const employerPf = Number(r.employer_pf);
                const employerEps = Number(r.employer_eps);
                totals.wages += epfWages; totals.employeePf += employeePf; totals.employerPf += employerPf; totals.employerEps += employerEps;
                const monthLabel = new Date(r.payment_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                lines.push([r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.uan || '', monthLabel, epfWages.toFixed(2), employeePf.toFixed(2), employerPf.toFixed(2), employerEps.toFixed(2)].join(','));
            }
            const first = empRows[0];
            lines.push([first.employee_code || '', `"${first.first_name} ${first.last_name}"`, first.uan || '', 'TOTAL', totals.wages.toFixed(2), totals.employeePf.toFixed(2), totals.employerPf.toFixed(2), totals.employerEps.toFixed(2)].join(','));
        }
        return { filename: `Form3A_${financialYear}.csv`, content: toCsv(header, lines) };
    },

    // Form 5 — EPFO's monthly return of employees newly enrolled in PF (new joiners whose
    // date of joining falls in the period and who are PF-enrolled).
    async generateForm5({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);

        const rows = await db.all(
            `SELECT employee_code, first_name, last_name, gender, dob, uan, pf_number, date_of_joining
             FROM employees
             WHERE company_id = ? AND is_pf_enabled = 1 AND date_of_joining BETWEEN ? AND ?
             ORDER BY date_of_joining`,
            [companyId, start, end]
        );
        if (rows.length === 0) throw ApiError.notFound('No new PF-enrolled joiners found for this period');

        const header = 'Employee Code,Name,Gender,Date of Birth,UAN,PF Number,Date of Joining';
        const lines = rows.map((r) =>
            [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.gender || '', r.dob || '', r.uan || '', r.pf_number || '', r.date_of_joining].join(',')
        );
        return { filename: `Form5_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // Form 10 — EPFO's monthly return of employees who left PF coverage (exited) in the period.
    async generateForm10({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);

        const rows = await db.all(
            `SELECT employee_code, first_name, last_name, uan, pf_number, date_of_joining, exit_date
             FROM employees
             WHERE company_id = ? AND is_pf_enabled = 1 AND exit_date BETWEEN ? AND ?
             ORDER BY exit_date`,
            [companyId, start, end]
        );
        if (rows.length === 0) throw ApiError.notFound('No PF-enrolled exits found for this period');

        const header = 'Employee Code,Name,UAN,PF Number,Date of Joining,Date of Leaving';
        const lines = rows.map((r) =>
            [r.employee_code || '', `"${r.first_name} ${r.last_name}"`, r.uan || '', r.pf_number || '', r.date_of_joining, r.exit_date].join(',')
        );
        return { filename: `Form10_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // Shared query behind all three bank-specific NEFT/RTGS bulk-upload files below — same
    // net-pay/account data the generic Bank Advice report uses.
    async _bankPaymentRows({ companyId, year, month }) {
        if (!companyId || !year || !month) throw ApiError.badRequest('companyId, year and month are required');
        const { start, end } = monthBounds(year, month);
        const rows = await db.all(
            `SELECT p.net_salary, e.first_name, e.last_name, e.employee_code, e.account_number, e.ifsc_code, e.email
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ? AND e.account_number IS NOT NULL AND e.account_number != ''
             ORDER BY e.first_name`,
            [start, end, companyId]
        );
        if (rows.length === 0) throw ApiError.notFound('No payroll records with a bank account on file were found for this period');
        return rows;
    },

    // SBI Corporate Internet Banking bulk NEFT/RTGS upload — column layout mirrors SBI CINB's
    // standard bulk-payment template. RTGS is used above SBI's own NEFT ceiling (₹2 lakh),
    // NEFT below it. Verify against your CINB portal's current template before uploading —
    // banks revise these periodically and don't publish a versioned spec.
    async generateBankFileSbi({ companyId, year, month }) {
        const rows = await this._bankPaymentRows({ companyId, year, month });
        const header = 'Beneficiary Account Number,Beneficiary Name,IFSC Code,Amount,Payment Type,Beneficiary Email,Remarks';
        const lines = rows.map((r) => {
            const amount = Number(r.net_salary);
            const mode = amount >= 200000 ? 'RTGS' : 'NEFT';
            return [r.account_number, `"${r.first_name} ${r.last_name}"`, r.ifsc_code || '', amount.toFixed(2), mode, r.email || '', `Salary ${month}/${year}`].join(',');
        });
        return { filename: `SBI_Salary_Upload_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // HDFC Bank corporate netbanking bulk-payment upload — column layout mirrors HDFC's
    // standard bulk NEFT/RTGS template. Same verify-before-upload caveat as SBI above.
    async generateBankFileHdfc({ companyId, year, month }) {
        const rows = await this._bankPaymentRows({ companyId, year, month });
        const valueDate = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');
        const header = 'Beneficiary Name,Account Number,IFSC,Amount,Payment Mode,Value Date,Remarks';
        const lines = rows.map((r) => {
            const amount = Number(r.net_salary);
            const mode = amount >= 200000 ? 'RTGS' : 'NEFT';
            return [`"${r.first_name} ${r.last_name}"`, r.account_number, r.ifsc_code || '', amount.toFixed(2), mode, valueDate, `Salary ${month}/${year}`].join(',');
        });
        return { filename: `HDFC_Salary_Upload_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },

    // ICICI Bank corporate internet banking bulk-payment upload — column layout mirrors
    // ICICI CIB's standard bulk NEFT/RTGS template. Same verify-before-upload caveat as SBI.
    async generateBankFileIcici({ companyId, year, month }) {
        const rows = await this._bankPaymentRows({ companyId, year, month });
        const header = 'Sr No,Beneficiary Name,Beneficiary Account No,IFSC Code,Amount,Mode,Email Id,Remarks';
        const lines = rows.map((r, i) => {
            const amount = Number(r.net_salary);
            const mode = amount >= 200000 ? 'RTGS' : 'NEFT';
            return [i + 1, `"${r.first_name} ${r.last_name}"`, r.account_number, r.ifsc_code || '', amount.toFixed(2), mode, r.email || '', `Salary ${month}/${year}`].join(',');
        });
        return { filename: `ICICI_Salary_Upload_${year}_${String(month).padStart(2, '0')}.csv`, content: toCsv(header, lines) };
    },
};
