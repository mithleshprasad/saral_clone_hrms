const db = require('../config/db');
const ApiError = require('../utils/ApiError');

function fmtDate(d) {
    if (!d) return '____________';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Plain-text templates with {{placeholder}} substitution — deliberately simple (no
// template editor UI) so every generated letter is backed by real employee/company data
// rather than a WYSIWYG builder that would take much longer to get right.
const TEMPLATES = {
    Appointment: (e, c) => `Dear ${e.first_name} ${e.last_name},

We are pleased to appoint you as ${e.position_title || '[Designation]'} in the ${e.department_name || '[Department]'} department of ${c?.name || '[Company]'}, effective from ${fmtDate(e.date_of_joining)}.

Your employment will be governed by the company's HR policies as amended from time to time. Your compensation and other terms will be communicated separately.

We look forward to a long and mutually beneficial association.

For ${c?.name || '[Company]'}
${c?.signatory_name || ''}
${c?.signatory_designation || ''}`,

    Offer: (e, c) => `Dear ${e.first_name} ${e.last_name},

We are pleased to offer you the position of ${e.position_title || '[Designation]'} at ${c?.name || '[Company]'}. Your anticipated date of joining is ${fmtDate(e.date_of_joining)}.

This offer is subject to satisfactory reference and background checks. Please confirm your acceptance by countersigning a copy of this letter.

We look forward to welcoming you to the team.

For ${c?.name || '[Company]'}
${c?.signatory_name || ''}
${c?.signatory_designation || ''}`,

    Relieving: (e, c) => `Dear ${e.first_name} ${e.last_name},

This is to confirm that your resignation has been accepted and you are relieved from the services of ${c?.name || '[Company]'} with effect from ${fmtDate(e.exit_date)}.

Your last working day was ${fmtDate(e.exit_date)}. Full and final settlement of your dues will be processed as per company policy.

We thank you for your contribution and wish you success in your future endeavors.

For ${c?.name || '[Company]'}
${c?.signatory_name || ''}
${c?.signatory_designation || ''}`,

    Increment: (e, c) => `Dear ${e.first_name} ${e.last_name},

We are pleased to inform you that, in recognition of your performance and contribution, your compensation has been revised effective ${fmtDate(new Date())}.

Revised Basic: Rs. ${Number(e.base_salary || 0).toLocaleString('en-IN')}
Revised Gross (approx.): Rs. ${(Number(e.base_salary || 0) + Number(e.da_rate || 0) + Number(e.hra_rate || 0) + Number(e.conveyance_allowance || 0) + Number(e.medical_allowance || 0) + Number(e.special_allowance_fixed || 0)).toLocaleString('en-IN')}

Congratulations, and thank you for your continued contribution to ${c?.name || 'the company'}.

For ${c?.name || '[Company]'}
${c?.signatory_name || ''}
${c?.signatory_designation || ''}`,

    Experience: (e, c) => `TO WHOMSOEVER IT MAY CONCERN

This is to certify that ${e.first_name} ${e.last_name} was employed with ${c?.name || '[Company]'} as ${e.position_title || '[Designation]'} in the ${e.department_name || '[Department]'} department from ${fmtDate(e.date_of_joining)} to ${fmtDate(e.exit_date) === '____________' ? 'present' : fmtDate(e.exit_date)}.

During this period, we found them to be sincere, hardworking and professional. We wish them success in their future endeavors.

For ${c?.name || '[Company]'}
${c?.signatory_name || ''}
${c?.signatory_designation || ''}`,
};

module.exports = {
    TYPES: Object.keys(TEMPLATES),

    async generate({ employee_id, type, generated_by }) {
        if (!TEMPLATES[type]) throw ApiError.badRequest(`Unknown letter type: ${type}`);

        const employee = await db.get(
            `SELECT e.*, d.name as department_name, pos.title as position_title
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions pos ON e.position_id = pos.id
             WHERE e.id = ?`,
            [employee_id]
        );
        if (!employee) throw ApiError.notFound('Employee not found');
        const company = employee.company_id ? await db.get('SELECT * FROM companies WHERE id = ?', [employee.company_id]) : null;

        const content = TEMPLATES[type](employee, company);

        const { insertId } = await db.run(
            'INSERT INTO letters (employee_id, type, content, generated_by) VALUES (?,?,?,?)',
            [employee_id, type, content, generated_by || null]
        );

        return { id: insertId, employee, company, type, content };
    },

    async getById(id) {
        const letter = await db.get('SELECT * FROM letters WHERE id = ?', [id]);
        if (!letter) throw ApiError.notFound('Letter not found');
        const employee = await db.get('SELECT * FROM employees WHERE id = ?', [letter.employee_id]);
        const company = employee?.company_id ? await db.get('SELECT * FROM companies WHERE id = ?', [employee.company_id]) : null;
        return { ...letter, employee, company };
    },

    async listByEmployee(employeeId) {
        return db.all('SELECT id, type, generated_at FROM letters WHERE employee_id = ? ORDER BY generated_at DESC', [employeeId]);
    },
};
