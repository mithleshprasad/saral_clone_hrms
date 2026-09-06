const db = require('../config/db');

const PayrollMonth = {
    async list(companyId) {
        const where = companyId ? 'WHERE company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(`SELECT * FROM payroll_months ${where} ORDER BY year DESC, month DESC`, params);
    },

    async findByYearMonth(companyId, year, month) {
        return db.get('SELECT * FROM payroll_months WHERE company_id = ? AND year = ? AND month = ?', [companyId, year, month]);
    },

    async findById(id) {
        return db.get('SELECT * FROM payroll_months WHERE id = ?', [id]);
    },

    async isLocked(companyId, year, month) {
        if (!companyId) return false; // no company scoping requested — nothing to lock against
        const row = await this.findByYearMonth(companyId, year, month);
        return !!(row && row.locked);
    },

    async create(companyId, year, month) {
        await db.run('INSERT IGNORE INTO payroll_months (company_id, year, month) VALUES (?, ?, ?)', [companyId, year, month]);
        return this.findByYearMonth(companyId, year, month);
    },

    async setLocked(id, locked) {
        await db.run(
            "UPDATE payroll_months SET status = ?, locked = ? WHERE id = ?",
            [locked ? 'Closed' : 'Open', locked ? 1 : 0, id]
        );
        return this.findById(id);
    },
};

module.exports = PayrollMonth;
