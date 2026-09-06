const db = require('../config/db');
const genericModel = require('./genericModel');

const base = genericModel(
    'loans',
    ['employee_id', 'loan_type', 'principal_amount', 'monthly_emi', 'start_date', 'balance', 'status'],
    { orderBy: 'id DESC', filterColumn: 'company_id' }
);

module.exports = {
    ...base,

    // Loans aren't directly tagged with a company — they belong to an employee,
    // who belongs to a company — so filtering by company has to join through that chain.
    async findAll(companyId) {
        const where = companyId ? 'WHERE e.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(
            `SELECT l.* FROM loans l
             JOIN employees e ON l.employee_id = e.id
             ${where}
             ORDER BY l.id DESC`,
            params
        );
    },
};
