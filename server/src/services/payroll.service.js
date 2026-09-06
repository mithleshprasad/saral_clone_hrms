const Payroll = require('../models/Payroll.model');
const PayrollMonth = require('../models/PayrollMonth.model');
const TaxDeclaration = require('../models/TaxDeclaration.model');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { REPORT_TYPES } = require('../constants');
const { estimatePeriodTds } = require('../utils/incomeTax');
const { computeMonthlyPT } = require('../utils/professionalTax');
const { computeOvertimeAmount } = require('../utils/overtime');
const { todayLocal } = require('../utils/dateUtils');
const mailer = require('./mailer.service');
const sms = require('./sms.service');

// Same calculation rules as the original Electron/SQLite app's payroll.js — pro-rated
// Basic/DA/HRA/Conveyance/Medical/Special, PF/EPS/ESI/PT/TDS, VPF, loan EMI, user-defined
// deductions, LOP by attendance — now split into a data layer (Payroll.model) and this
// business-logic layer.
async function generatePayroll(data) {
    const startParts = (data.startDate || '').split('-');
    const year = parseInt(startParts[0], 10);
    const month = parseInt(startParts[1], 10);

    const totalWorkingDays = (year && month) ? new Date(year, month, 0).getDate() : 30;

    if (year && month && await PayrollMonth.isLocked(data.companyId, year, month)) {
        throw ApiError.conflict('Payroll month is closed for the selected period');
    }

    const employeesToProcess = await Payroll.findEmployeesForCalculation({ employeeId: data.employeeId, companyId: data.companyId });
    if (data.employeeId && employeesToProcess.length === 0) {
        throw ApiError.notFound('Employee not found');
    }

    const settingsArr = await Payroll.allSettings();
    const getSet = (k, def) => {
        const row = settingsArr.find((s) => s.key === k);
        return row ? parseFloat(row.value) : def;
    };

    const pfPercentDefault = getSet('pf_percentage', 12) / 100;
    const ptAmount = getSet('professional_tax', 200);

    // Attendance Configuration per company — overtime gates/thresholds. Fetched once for
    // every distinct company in this run rather than per-employee (a run is normally
    // single-company, but company-wide "generate for all" runs shouldn't misapply one
    // company's config to another's employees).
    const companyIds = [...new Set(employeesToProcess.map((e) => e.company_id).filter(Boolean))];
    const otConfigByCompany = new Map();
    if (companyIds.length > 0) {
        const configRows = await db.all(
            `SELECT * FROM attendance_configs WHERE company_id IN (${companyIds.map(() => '?').join(',')})`,
            companyIds
        );
        for (const c of configRows) if (!otConfigByCompany.has(c.company_id)) otConfigByCompany.set(c.company_id, c);
    }

    const today = todayLocal();
    const skipped = [];
    const blocked = []; // employees whose company's subscription is inactive/expired/suspended
    let processedCount = 0;

    for (const emp of employeesToProcess) {
        try {
            const empId = emp.id;

            // Application-control kill switch: a company the Super Admin has suspended,
            // or whose subscription has lapsed, cannot have payroll run for its employees.
            if (emp.company_is_active === 0 || ['Expired', 'Suspended'].includes(emp.company_subscription_status)) {
                blocked.push(empId);
                continue;
            }

            const exists = await Payroll.findExisting(empId, data.startDate, data.endDate);
            if (exists) {
                if (data.skip_completed) skipped.push(empId);
                continue;
            }

            const monthlyBasic = Number(emp.base_salary) || 0;
            const monthlyDA = Number(emp.da_rate) || 0;
            const monthlyHRA = Number(emp.hra_rate) || 0;
            const monthlyConv = Number(emp.conveyance_allowance) || 0;
            const monthlyMed = Number(emp.medical_allowance) || 0;
            const monthlySpl = Number(emp.special_allowance_fixed) || 0;

            let totalMonthlyGross = monthlyBasic + monthlyDA + monthlyHRA + monthlyConv + monthlyMed + monthlySpl;
            if (totalMonthlyGross <= 0 && emp.pos_salary > 0) {
                totalMonthlyGross = Number(emp.pos_salary);
            }

            const effDays = await Payroll.countPresentDays(empId, data.startDate, data.endDate);

            let lop = 0;
            if (effDays < totalWorkingDays) {
                const lopDays = totalWorkingDays - Math.max(0, effDays);
                lop = Math.round((totalMonthlyGross / totalWorkingDays) * lopDays);
            }

            let basic = 0, da = 0, hra = 0, conveyance = 0, medical = 0, special = 0;

            if (data.manual_basic && Number(data.manual_basic) > 0) {
                basic = Math.round(Number(data.manual_basic) || 0);
                da = Math.round(Number(data.manual_da) || 0);
                hra = Math.round(Number(data.manual_hra) || 0);
                conveyance = Math.round(Number(data.manual_conveyance) || 0);
                medical = Math.round(Number(data.manual_medical) || 0);
                special = Math.round(Number(data.manual_special) || 0);
            } else if (monthlyBasic > 0 || monthlyDA > 0) {
                // Absence is already deducted separately via `lop` below — do not also
                // shrink these by attendanceFactor, or LOP gets subtracted twice.
                basic = Math.round(monthlyBasic);
                da = Math.round(monthlyDA);
                hra = Math.round(monthlyHRA);
                conveyance = Math.round(monthlyConv);
                medical = Math.round(monthlyMed);
                special = Math.round(monthlySpl);
            } else {
                basic = Math.round(totalMonthlyGross * 0.5);
                hra = Math.round(basic * 0.4);
                special = Math.round(totalMonthlyGross - basic - hra);
            }

            let pfPercent = emp.pf_rate ? (Number(emp.pf_rate) / 100) : pfPercentDefault;
            if (emp.is_pf_enabled === 0) pfPercent = 0;

            const pfWage = (emp.pf_limit_enabled !== 0)
                ? Math.min(basic + da, Number(emp.pf_limit) || 15000)
                : (basic + da);

            const employee_pf = Math.round(pfWage * pfPercent);

            let employer_pf = 0;
            let employer_eps = 0;
            if (pfPercent > 0) {
                const employerPfPercent = getSet('employer_pf_percentage', 12) / 100;
                employer_pf = Math.round(pfWage * employerPfPercent);

                const eps_wage_limit = getSet('eps_wage_limit', 15000);
                employer_eps = Math.round(Math.min(pfWage, eps_wage_limit) * 0.0833);
            }

            const otRow = await db.get(
                'SELECT COALESCE(SUM(overtime_hours),0) as total FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?',
                [empId, data.startDate, data.endDate]
            );
            const overtimeHours = Number(otRow?.total || 0);
            const overtimeAmount = computeOvertimeAmount({
                overtimeHours, monthlyGross: totalMonthlyGross, workingDays: totalWorkingDays,
                config: otConfigByCompany.get(emp.company_id),
            });

            const earningsSubtotal = basic + da + hra + conveyance + medical + special + overtimeAmount;

            // State-wise PT slabs (see utils/professionalTax.js) when the company's state is
            // mapped; the flat professional_tax setting is the fallback for unmapped states
            // (e.g. half-yearly states like Tamil Nadu/Kerala, or no state on file).
            let pt = 0;
            const positionAllowsPt = emp.position_deduct_pt === null || emp.position_deduct_pt === undefined || emp.position_deduct_pt === 1;
            if (emp.is_pt_enabled !== 0 && positionAllowsPt) {
                const statePt = computeMonthlyPT(emp.company_state, earningsSubtotal);
                pt = statePt !== null ? statePt : ptAmount;
            }

            const vpfPercent = (Number(emp.vpf_percent) || 0) / 100;
            const vpfAmount = vpfPercent > 0 ? Math.round(pfWage * vpfPercent) : 0;

            const loanEmi = await Payroll.sumActiveLoanEmi(empId);
            const loanDeduction = Math.round(loanEmi);

            const userDeductions = await Payroll.activeUserDeductions();

            // Old-regime-only investment declarations (80C/80D/HRA/home loan/other) —
            // the new regime (an employee's default unless they've opted for Old) ignores
            // these entirely, per law. Professional tax paid is deductible under Sec 16(iii)
            // regardless of regime, so it comes off the annualized income too.
            const approvedAnnualDeclaration = await TaxDeclaration.approvedTotalForDate(empId, data.startDate);
            const regime = emp.tax_regime === 'Old' ? 'Old' : 'New';
            const annualDeclaredDeductions = regime === 'Old' ? approvedAnnualDeclaration : 0;
            const periodGrossForTax = Math.max(0, earningsSubtotal - pt);
            const tds = estimatePeriodTds({
                periodGrossIncome: periodGrossForTax,
                periodsPerYear: 12,
                regime,
                annualDeclaredDeductions,
            });

            const bonuses = parseFloat(data.bonuses) || 0;
            const otherDeductions = parseFloat(data.deductions) || 0;
            const grossEarnings = earningsSubtotal + bonuses;

            let userDefinedDeductionTotal = 0;
            for (const ud of userDeductions) {
                userDefinedDeductionTotal += ud.calc_type === 'Percentage'
                    ? Math.round(grossEarnings * (Number(ud.amount) || 0) / 100)
                    : Math.round(Number(ud.amount) || 0);
            }

            const esiThreshold = getSet('esi_threshold', 21000);
            const esiEmployeeRate = getSet('esi_employee_percentage', 0.75) / 100;
            const esiEmployerRate = getSet('esi_employer_percentage', 3.25) / 100;
            let employee_esi = 0, employer_esi = 0;

            if (emp.is_esi_enabled === 1 && grossEarnings <= esiThreshold) {
                employee_esi = Math.round(grossEarnings * esiEmployeeRate);
                employer_esi = Math.round(grossEarnings * esiEmployerRate);
            }

            const totalDeductions = employee_pf + vpfAmount + pt + tds + otherDeductions + employee_esi + lop + loanDeduction + userDefinedDeductionTotal;
            const net = grossEarnings - totalDeductions;

            await Payroll.insert({
                employee_id: empId, pay_period_start: data.startDate, pay_period_end: data.endDate,
                base_salary: totalMonthlyGross,
                basic_salary: basic, da, hra, conveyance, medical, special_allowance: special,
                overtime_hours: overtimeHours, overtime_amount: overtimeAmount,
                bonuses, employee_pf, employer_pf, employer_eps, employee_esi, employer_esi,
                professional_tax: pt, tds, other_deductions: otherDeductions, lop_amount: lop,
                gross_salary: grossEarnings, total_deductions: totalDeductions, net_salary: net,
                payment_date: today,
                vpf_percent: Number(emp.vpf_percent) || 0, vpf_amount: vpfAmount,
                loan_deduction: loanDeduction, user_defined_deduction: userDefinedDeductionTotal,
            });

            if (loanDeduction > 0) {
                await Payroll.settleLoanEmi(empId);
            }

            // Best-effort notifications — mailer/sms.service.js swallow their own send
            // failures and log them, so this never blocks or fails the payroll run.
            const periodLabel = new Date(data.startDate).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
            if (emp.email) {
                await mailer.send({
                    to: emp.email,
                    subject: `Your payslip for ${periodLabel} is ready`,
                    template: 'payslip_ready',
                    employeeId: empId,
                    html: `
                        <p>Hi ${emp.first_name},</p>
                        <p>Your payslip for <strong>${periodLabel}</strong> has been processed. Net pay: <strong>₹${net.toLocaleString('en-IN')}</strong>.</p>
                        <p>Log in to Employee Self-Service to view or download the full payslip.</p>
                    `,
                });
            }
            if (emp.phone) {
                await sms.send({
                    to: emp.phone,
                    message: `Hi ${emp.first_name}, your payslip for ${periodLabel} is ready. Net pay: Rs.${net.toLocaleString('en-IN')}. Log in to ESS to view it. -MpxHR`,
                    template: 'payslip_ready',
                    employeeId: empId,
                });
            }

            processedCount++;
        } catch (ex) {
            console.error('Payroll generation error for emp', emp.id, ex.message);
        }
    }

    return { success: true, processed: processedCount, skipped, blocked };
}

async function list(query) {
    return Payroll.list(query);
}

async function get(id) {
    const row = await Payroll.findById(id);
    if (!row) throw ApiError.notFound('Payroll record not found');
    return row;
}

async function getPayslipData(id) {
    const data = await Payroll.findWithFullDetails(id);
    if (!data) throw ApiError.notFound('Payroll record not found');
    return data;
}

async function getForm16Data(employeeId, financialYear) {
    if (!financialYear || !/^\d{4}-\d{4}$/.test(financialYear)) {
        throw ApiError.badRequest('financialYear must be like "2026-2027"');
    }
    const [startYear] = financialYear.split('-');
    const startDate = `${startYear}-04-01`;
    const endDate = `${parseInt(startYear, 10) + 1}-03-31`;

    const employee = await db.get(
        `SELECT e.*, d.name as department_name, pos.title as position_title
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN positions pos ON e.position_id = pos.id
         WHERE e.id = ?`,
        [employeeId]
    );
    if (!employee) throw ApiError.notFound('Employee not found');
    const company = employee.company_id ? await db.get('SELECT * FROM companies WHERE id = ?', [employee.company_id]) : null;

    const annual = await Payroll.annualSummaryForEmployee(employeeId, startDate, endDate);
    const declaration = await TaxDeclaration.findByEmployeeAndYear(employeeId, financialYear);

    return {
        employee, company, financialYear,
        annual: {
            ...annual,
            declared_deductions: declaration?.status === 'Approved' ? Number(declaration.total_declared) : 0,
        },
    };
}

async function remove(id) {
    await Payroll.remove(id);
}

const EDITABLE_EARNING_FIELDS = ['basic_salary', 'da', 'hra', 'conveyance', 'medical', 'special_allowance', 'bonuses'];
const EDITABLE_DEDUCTION_FIELDS = [
    'employee_pf', 'vpf_amount', 'professional_tax', 'tds', 'other_deductions',
    'employee_esi', 'lop_amount', 'loan_deduction', 'user_defined_deduction',
];

// Powers the monthly Salary Editor grid — lets earning/deduction components on an
// already-generated payslip be hand-adjusted, then recomputes gross/total deductions/net
// from those components rather than re-running the full payroll engine.
async function updateComponents(id, fields) {
    const existing = await Payroll.findRawById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');

    const updates = {};
    [...EDITABLE_EARNING_FIELDS, ...EDITABLE_DEDUCTION_FIELDS].forEach((f) => {
        if (f in fields) updates[f] = Number(fields[f]) || 0;
    });
    if (Object.keys(updates).length === 0) throw ApiError.badRequest('No editable fields provided');

    const merged = { ...existing, ...updates };
    const grossSalary = EDITABLE_EARNING_FIELDS.reduce((sum, f) => sum + Number(merged[f] || 0), 0);
    const totalDeductions = EDITABLE_DEDUCTION_FIELDS.reduce((sum, f) => sum + Number(merged[f] || 0), 0);
    const netSalary = grossSalary - totalDeductions;

    await Payroll.updateComponents(id, { ...updates, gross_salary: grossSalary, total_deductions: totalDeductions, net_salary: netSalary });
    return get(id);
}

// Statutory / MIS report shapes — mirrors the report set the desktop app exposed
// (salary sheet, PF/ESI, bank advice, tax, Form 16 feeder, bank transfer file,
// yearly salary summary, department-wise summary).
async function report(type, { month, year, companyId }) {
    if (!companyId) throw ApiError.badRequest('companyId is required');

    // Loan/advance ledger isn't tied to a payroll period — it's the current standing of
    // every loan a company has ever issued, so it skips the year/month requirement below.
    if (type === REPORT_TYPES.LOAN_LEDGER) {
        return Payroll.report(
            `SELECT e.employee_code, e.first_name, e.last_name, l.loan_type, l.principal_amount,
                    (l.principal_amount - l.balance) as amount_recovered, l.balance as outstanding_balance,
                    l.monthly_emi, l.start_date, l.status
             FROM loans l JOIN employees e ON l.employee_id = e.id
             WHERE e.company_id = ?
             ORDER BY (l.status = 'Closed'), e.first_name`,
            [companyId]
        );
    }

    if (!year) throw ApiError.badRequest('year is required');

    let start, end;
    if (type === REPORT_TYPES.YEARLY_SALARY || type === REPORT_TYPES.FORM_16) {
        start = `${year}-04-01`;
        end = `${parseInt(year, 10) + 1}-03-31`;
    } else {
        if (!month) throw ApiError.badRequest('month is required for this report type');
        start = `${year}-${String(month).padStart(2, '0')}-01`;
        end = `${year}-${String(month).padStart(2, '0')}-31`;
    }
    const params = [start, end, companyId];

    const queries = {
        [REPORT_TYPES.SAL_SHEET]: `
            SELECT p.*, e.first_name, e.last_name, d.name as department_name, pos.title as designation_title
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions pos ON e.position_id = pos.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?`,
        [REPORT_TYPES.PF_ESI]: `
            SELECT p.employee_pf, p.employer_pf, p.employee_esi, p.employer_esi, p.gross_salary, p.basic_salary,
                   e.first_name, e.last_name, e.uan, e.esi_number
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?`,
        [REPORT_TYPES.BANK_ADV]: `
            SELECT p.net_salary, p.payment_date, e.first_name, e.last_name, e.account_number, e.ifsc_code, e.bank_name
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?`,
        [REPORT_TYPES.TAX_REP]: `
            SELECT p.gross_salary, p.professional_tax, p.tds, p.net_salary, e.first_name, e.last_name, e.pan_number
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?`,
        [REPORT_TYPES.FORM_16]: `
            SELECT e.id, e.first_name, e.last_name, e.pan_number,
                   SUM(p.gross_salary) as gross_income, SUM(p.basic_salary) as annual_basic,
                   SUM(p.hra) as annual_hra, SUM(p.da) as annual_da,
                   SUM(p.special_allowance + p.bonuses) as annual_allowances,
                   SUM(p.employee_pf) as annual_pf, SUM(p.professional_tax) as annual_pt,
                   SUM(p.tds) as annual_tds, SUM(p.net_salary) as net_salary
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
            GROUP BY e.id`,
        [REPORT_TYPES.YEARLY_SALARY]: `
            SELECT e.id, e.first_name, e.last_name, e.pan_number,
                   SUM(p.gross_salary) as gross_salary, SUM(p.basic_salary) as basic_salary,
                   SUM(p.employee_pf) as employee_pf, SUM(p.professional_tax) as professional_tax,
                   SUM(p.tds) as tds, SUM(p.net_salary) as net_salary
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
            GROUP BY e.id`,
        [REPORT_TYPES.DEPT_SUMMARY]: `
            SELECT d.name as department_name, COUNT(DISTINCT p.employee_id) as emp_count,
                   SUM(p.gross_salary) as gross_salary, SUM(p.net_salary) as net_salary,
                   SUM(p.employee_pf) as employee_pf, SUM(p.employer_pf) as employer_pf, SUM(p.tds) as tds
            FROM payroll p JOIN employees e ON p.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE p.payment_date BETWEEN ? AND ? AND e.company_id = ?
            GROUP BY d.id`,
    };
    queries[REPORT_TYPES.BANK_TRANSFER] = queries[REPORT_TYPES.BANK_ADV];

    const sql = queries[type];
    if (!sql) throw ApiError.badRequest(`Unknown report type: ${type}`);
    return Payroll.report(sql, params);
}

async function listMonths(companyId) {
    return PayrollMonth.list(companyId);
}

async function createMonth(companyId, year, month) {
    if (!companyId) throw ApiError.badRequest('companyId is required');
    if (!year || !month) throw ApiError.badRequest('year and month are required');
    return PayrollMonth.create(companyId, year, month);
}

async function closeMonth(id) {
    return PayrollMonth.setLocked(id, true);
}

async function reopenMonth(id) {
    return PayrollMonth.setLocked(id, false);
}

module.exports = { generatePayroll, list, get, getPayslipData, getForm16Data, remove, updateComponents, report, listMonths, createMonth, closeMonth, reopenMonth };
