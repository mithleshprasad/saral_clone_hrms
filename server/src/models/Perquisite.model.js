const db = require('../config/db');

const Perquisite = {
    async list({ employeeId, companyId, financialYear } = {}) {
        const where = [];
        const params = [];
        if (employeeId) { where.push('p.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (financialYear) { where.push('p.financial_year = ?'); params.push(financialYear); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        return db.all(
            `SELECT p.*, e.first_name, e.last_name, e.employee_code, e.pan_number
             FROM perquisites p JOIN employees e ON p.employee_id = e.id
             ${whereSQL}
             ORDER BY p.created_at DESC`,
            params
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM perquisites WHERE id = ?', [id]);
    },

    async create(d) {
        const { insertId } = await db.run(
            `INSERT INTO perquisites (employee_id, financial_year, perquisite_type, description, value, amount_recovered)
             VALUES (?,?,?,?,?,?)`,
            [d.employee_id, d.financial_year, d.perquisite_type, d.description || null, d.value, d.amount_recovered || 0]
        );
        return this.findById(insertId);
    },

    async remove(id) {
        await db.run('DELETE FROM perquisites WHERE id = ?', [id]);
    },
};

module.exports = Perquisite;
