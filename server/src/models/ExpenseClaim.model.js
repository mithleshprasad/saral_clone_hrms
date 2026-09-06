const db = require('../config/db');

const ExpenseClaim = {
    async list({ employeeId, companyId, status } = {}) {
        const where = [];
        const params = [];
        if (employeeId) { where.push('c.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (status) { where.push('c.status = ?'); params.push(status); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        return db.all(
            `SELECT c.*, e.first_name, e.last_name, e.employee_code
             FROM expense_claims c JOIN employees e ON c.employee_id = e.id
             ${whereSQL}
             ORDER BY c.created_at DESC`,
            params
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM expense_claims WHERE id = ?', [id]);
    },

    async create(d) {
        const { insertId } = await db.run(
            `INSERT INTO expense_claims
                (employee_id, category, amount, expense_date, description, receipt_original_name, receipt_stored_name, status)
             VALUES (?,?,?,?,?,?,?,'Pending')`,
            [d.employee_id, d.category, d.amount, d.expense_date, d.description || null, d.receipt_original_name || null, d.receipt_stored_name || null]
        );
        return this.findById(insertId);
    },

    async setStatus(id, status, remarks, reviewedBy) {
        await db.run(
            'UPDATE expense_claims SET status = ?, remarks = ?, reviewed_by = ? WHERE id = ?',
            [status, remarks || null, reviewedBy || null, id]
        );
        return this.findById(id);
    },
};

module.exports = ExpenseClaim;
