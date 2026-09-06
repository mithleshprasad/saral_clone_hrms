const ROLES = Object.freeze({
    SUPER_ADMIN: 'Super Admin', // platform operator: subscriptions, tenant/company enablement
    ADMIN: 'Admin',
    HR: 'HR',
    EMPLOYEE: 'Employee',
});

const SUBSCRIPTION_STATUS = Object.freeze({
    TRIAL: 'Trial',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    SUSPENDED: 'Suspended',
});

const EMPLOYEE_STATUS = Object.freeze({
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    RESIGNED: 'Resigned',
});

const PAYROLL_STATUS = Object.freeze({
    PENDING: 'Pending',
    PAID: 'Paid',
});

const PAYROLL_MONTH_STATUS = Object.freeze({
    OPEN: 'Open',
    CLOSED: 'Closed',
});

const LEAVE_STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
});

const REPORT_TYPES = Object.freeze({
    SAL_SHEET: 'sal_sheet',
    PF_ESI: 'pf_esi',
    BANK_ADV: 'bank_adv',
    BANK_TRANSFER: 'bank_transfer',
    TAX_REP: 'tax_rep',
    FORM_16: 'form_16',
    YEARLY_SALARY: 'yearly_salary',
    DEPT_SUMMARY: 'dept_summary',
    LOAN_LEDGER: 'loan_ledger',
});

// Seeded on first migrate; editable afterwards via the Settings screen.
const DEFAULT_SETTINGS = [
    ['pf_percentage', '12', 'Employee PF contribution %'],
    ['employer_pf_percentage', '12', 'Employer PF contribution %'],
    ['eps_wage_limit', '15000', 'EPS wage ceiling used for employer EPS split'],
    ['esi_threshold', '21000', 'Gross salary ceiling below which ESI applies'],
    ['esi_employee_percentage', '0.75', 'Employee ESI contribution %'],
    ['esi_employer_percentage', '3.25', 'Employer ESI contribution %'],
    ['professional_tax', '200', 'Flat monthly professional tax amount'],
];

// Seeded into leave_types for every new company (and backfilled once for existing
// companies with none) so the leave-request dropdown has something real to show instead
// of a hardcoded, unconfigurable list. Comp-Off/On Duty/Permission are event-driven
// (earned by working a holiday, or a short excused absence) rather than annually
// accrued, so auto-allotment is off for those three.
const DEFAULT_LEAVE_TYPES = [
    { name: 'Casual Leave', short_code: 'CL', max_days: 12, color: '#4A90D9', priority: 1 },
    { name: 'Sick Leave', short_code: 'SL', max_days: 12, color: '#E4572E', priority: 2 },
    { name: 'Earned Leave', short_code: 'EL', max_days: 15, color: '#2E8B57', priority: 3 },
    { name: 'Unpaid Leave', short_code: 'LWP', max_days: null, color: '#888888', priority: 4 },
    { name: 'Comp-Off', short_code: 'CO', max_days: null, color: '#8E44AD', priority: 5, auto_allotment_enabled: 0 },
    { name: 'On Duty', short_code: 'OD', max_days: null, color: '#1ABC9C', priority: 6, auto_allotment_enabled: 0 },
    { name: 'Permission', short_code: 'PER', max_days: null, color: '#F39C12', priority: 7, auto_allotment_enabled: 0 },
];

module.exports = {
    ROLES,
    SUBSCRIPTION_STATUS,
    EMPLOYEE_STATUS,
    PAYROLL_STATUS,
    PAYROLL_MONTH_STATUS,
    LEAVE_STATUS,
    REPORT_TYPES,
    DEFAULT_SETTINGS,
    DEFAULT_LEAVE_TYPES,
};
