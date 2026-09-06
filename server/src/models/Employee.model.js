const db = require('../config/db');

const WRITABLE_FIELDS = [
    'first_name', 'last_name', 'employee_code', 'email', 'phone', 'company_id', 'branch_id',
    'department_id', 'position_id', 'category_id', 'date_of_joining', 'status',
    'gender', 'dob', 'address', 'city', 'state', 'zip_code', 'bank_name', 'account_number', 'ifsc_code',
    'base_salary', 'pf_number', 'esi_number', 'uan', 'pf_rate', 'esi_rate', 'payment_mode', 'exit_date',
    'is_pf_enabled', 'is_esi_enabled', 'is_pt_enabled', 'pf_limit_enabled', 'pf_limit', 'vpf_percent', 'tax_regime',
    'father_name', 'pan_number', 'aadhaar_number', 'blood_group', 'emergency_contact_name', 'emergency_contact_phone',
    'da_rate', 'hra_rate', 'conveyance_allowance', 'medical_allowance', 'special_allowance_fixed',
    'photo', 'salary_from', 'wage_basis', 'is_confirmed', 'probation_end_date',
    'is_transfer_eligible', 'transfer_date',
];

const WITH_JOINS = `
    SELECT e.*, d.name as department_name, p.title as position_title, c.name as company_name, b.name as branch_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN companies c ON e.company_id = c.id
    LEFT JOIN branches b ON e.branch_id = b.id
`;

const Employee = {
    WRITABLE_FIELDS,

    async paginate({ page = 1, limit = 50, search, companyId, branchId, departmentId, status }) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (companyId) { conditions.push('e.company_id = ?'); params.push(companyId); }
        if (branchId) { conditions.push('e.branch_id = ?'); params.push(branchId); }
        if (departmentId) { conditions.push('e.department_id = ?'); params.push(departmentId); }
        if (status) { conditions.push('e.status = ?'); params.push(status); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRow = await db.get(`SELECT COUNT(*) as count FROM employees e ${where}`, params);
        const total = countRow ? countRow.count : 0;

        const rows = await db.all(
            `${WITH_JOINS} ${where} ORDER BY e.first_name ASC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { employees: rows, total, page, totalPages: Math.ceil(total / limit) };
    },

    async findById(id) {
        return db.get(`${WITH_JOINS} WHERE e.id = ?`, [id]);
    },

    async create(data) {
        // Every writable column is sent explicitly (including NULL for anything omitted),
        // which bypasses MySQL's own column DEFAULT — so defaults that matter for query
        // filters (payroll's "WHERE status = 'Active'", this file's own status-based counts)
        // have to be applied here instead of relying on the schema.
        const defaults = { status: 'Active', payment_mode: 'Bank', wage_basis: 'Monthly' };
        const values = WRITABLE_FIELDS.map((f) => {
            if (data[f] !== undefined) return data[f];
            return f in defaults ? defaults[f] : null;
        });
        const { insertId } = await db.run(
            `INSERT INTO employees (${WRITABLE_FIELDS.join(', ')}) VALUES (${WRITABLE_FIELDS.map(() => '?').join(', ')})`,
            values
        );
        return db.get('SELECT * FROM employees WHERE id = ?', [insertId]);
    },

    async update(id, data) {
        const updates = WRITABLE_FIELDS.filter((f) => f in data);
        if (updates.length === 0) return db.get('SELECT * FROM employees WHERE id = ?', [id]);
        await db.run(
            `UPDATE employees SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
            [...updates.map((f) => data[f]), id]
        );
        return db.get('SELECT * FROM employees WHERE id = ?', [id]);
    },

    async exists(id) {
        const row = await db.get('SELECT id FROM employees WHERE id = ?', [id]);
        return !!row;
    },

    // FK ON DELETE CASCADE handles attendance/leaves/leave_balances/payroll/documents/
    // onboarding_tasks/employee_shifts/performance_reviews; tickets/assets/users are
    // detached (ON DELETE SET NULL) rather than deleted — see schema.sql.
    async remove(id) {
        await db.run('DELETE FROM employees WHERE id = ?', [id]);
    },
};

module.exports = Employee;
