// Whitelisted columns the Report Writer can select — the dynamic query builder only ever
// emits SQL expressions from this map, never raw client input, so there is no injection
// surface even though the column *choice* is client-driven.
const REPORT_COLUMNS = {
    // Classification / employee fields
    employee_code: { label: 'Emp Code', expr: 'e.employee_code', group: 'Classification' },
    first_name: { label: 'First Name', expr: 'e.first_name', group: 'Classification' },
    last_name: { label: 'Last Name', expr: 'e.last_name', group: 'Classification' },
    department_name: { label: 'Department', expr: 'd.name', group: 'Classification' },
    position_title: { label: 'Designation', expr: 'pos.title', group: 'Classification' },
    branch_name: { label: 'Branch', expr: 'b.name', group: 'Classification' },
    bank_name: { label: 'Bank Name', expr: 'e.bank_name', group: 'Classification' },
    account_number: { label: 'Bank A/c No.', expr: 'e.account_number', group: 'Classification' },
    ifsc_code: { label: 'IFSC', expr: 'e.ifsc_code', group: 'Classification' },

    // Additional information
    gender: { label: 'Gender', expr: 'e.gender', group: 'Additional Information' },
    father_name: { label: "Father's Name", expr: 'e.father_name', group: 'Additional Information' },
    dob: { label: 'Date of Birth', expr: 'e.dob', group: 'Additional Information' },
    date_of_joining: { label: 'Date of Joining', expr: 'e.date_of_joining', group: 'Additional Information' },
    salary_from: { label: 'Salary Calc. From', expr: 'e.salary_from', group: 'Additional Information' },
    exit_date: { label: 'Date of Leaving', expr: 'e.exit_date', group: 'Additional Information' },
    probation_end_date: { label: 'Probation Compl. Date', expr: 'e.probation_end_date', group: 'Additional Information' },
    pan_number: { label: 'PAN', expr: 'e.pan_number', group: 'Additional Information' },
    uan: { label: 'UAN', expr: 'e.uan', group: 'Additional Information' },

    // Salary heads (from the payroll record for the selected period)
    basic_salary: { label: 'Basic', expr: 'p.basic_salary', group: 'Salary Heads', aggregatable: true },
    da: { label: 'DA', expr: 'p.da', group: 'Salary Heads', aggregatable: true },
    hra: { label: 'HRA', expr: 'p.hra', group: 'Salary Heads', aggregatable: true },
    conveyance: { label: 'Conveyance', expr: 'p.conveyance', group: 'Salary Heads', aggregatable: true },
    medical: { label: 'Medical', expr: 'p.medical', group: 'Salary Heads', aggregatable: true },
    special_allowance: { label: 'Special Allowance', expr: 'p.special_allowance', group: 'Salary Heads', aggregatable: true },
    bonuses: { label: 'Bonus', expr: 'p.bonuses', group: 'Salary Heads', aggregatable: true },
    gross_salary: { label: 'Gross Salary', expr: 'p.gross_salary', group: 'Salary Heads', aggregatable: true },
    employee_pf: { label: 'PF (Employee)', expr: 'p.employee_pf', group: 'Salary Heads', aggregatable: true },
    employer_pf: { label: 'PF (Employer)', expr: 'p.employer_pf', group: 'Salary Heads', aggregatable: true },
    employee_esi: { label: 'ESI (Employee)', expr: 'p.employee_esi', group: 'Salary Heads', aggregatable: true },
    employer_esi: { label: 'ESI (Employer)', expr: 'p.employer_esi', group: 'Salary Heads', aggregatable: true },
    professional_tax: { label: 'Professional Tax', expr: 'p.professional_tax', group: 'Salary Heads', aggregatable: true },
    tds: { label: 'TDS', expr: 'p.tds', group: 'Salary Heads', aggregatable: true },
    lop_amount: { label: 'Loss of Pay', expr: 'p.lop_amount', group: 'Salary Heads', aggregatable: true },
    loan_deduction: { label: 'Loan EMI', expr: 'p.loan_deduction', group: 'Salary Heads', aggregatable: true },
    total_deductions: { label: 'Total Deductions', expr: 'p.total_deductions', group: 'Salary Heads', aggregatable: true },
    net_salary: { label: 'Net Salary', expr: 'p.net_salary', group: 'Salary Heads', aggregatable: true },
    payment_date: { label: 'Payment Date', expr: 'p.payment_date', group: 'Salary Heads' },
};

module.exports = { REPORT_COLUMNS };
