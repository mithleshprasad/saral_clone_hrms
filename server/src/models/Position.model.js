const db = require('../config/db');
const genericModel = require('./genericModel');

const base = genericModel(
    'positions',
    ['title', 'department_id', 'base_salary', 'description', 'lwf_category', 'deduct_pt', 'probation_period_days'],
    { orderBy: 'title', filterColumn: 'company_id' }
);

module.exports = {
    ...base,

    // Positions aren't directly tagged with a company — they belong to a department,
    // which belongs to a company — so filtering by company has to join through that chain.
    // Also filterable directly by department_id (the Employee form's "Designation" dropdown
    // needs only the selected department's positions, not the whole company's).
    async findAll({ companyId, departmentId } = {}) {
        const where = [];
        const params = [];
        if (departmentId) { where.push('p.department_id = ?'); params.push(departmentId); }
        if (companyId) { where.push('d.company_id = ?'); params.push(companyId); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        return db.all(
            `SELECT p.*, d.name as department_name FROM positions p
             LEFT JOIN departments d ON p.department_id = d.id
             ${whereSQL}
             ORDER BY p.title`,
            params
        );
    },
};
