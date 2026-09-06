const db = require('../config/db');

const SETTLEMENT_FIELDS = [
    'employee_id', 'date_of_leaving', 'reason_for_leaving',
    'include_last_month_salary', 'include_pending_advance', 'include_open_component', 'include_held_salary', 'include_pending_loan',
    'gratuity_amount', 'leave_encashment_amount', 'status', 'remarks',
];

const FnfSettlement = {
    async list({ employeeId, companyId } = {}) {
        const where = [];
        const params = [];
        if (employeeId) { where.push('f.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        return db.all(
            `SELECT f.*, e.first_name, e.last_name, e.employee_code
             FROM fnf_settlements f JOIN employees e ON f.employee_id = e.id
             ${whereSQL}
             ORDER BY f.created_at DESC`,
            params
        );
    },

    async findById(id) {
        return db.get(
            `SELECT f.*, e.first_name, e.last_name, e.employee_code, e.date_of_joining, e.salary_from,
                    d.name as department_name, p.title as position_title
             FROM fnf_settlements f
             JOIN employees e ON f.employee_id = e.id
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             WHERE f.id = ?`,
            [id]
        );
    },

    async create(data) {
        const values = SETTLEMENT_FIELDS.map((f) => (data[f] !== undefined ? data[f] : null));
        const { insertId } = await db.run(
            `INSERT INTO fnf_settlements (${SETTLEMENT_FIELDS.join(', ')}) VALUES (${SETTLEMENT_FIELDS.map(() => '?').join(', ')})`,
            values
        );
        return insertId;
    },

    async update(id, data) {
        const updates = SETTLEMENT_FIELDS.filter((f) => f in data);
        if (updates.length === 0) return;
        await db.run(
            `UPDATE fnf_settlements SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
            [...updates.map((f) => data[f]), id]
        );
    },

    async updateTotals(id, totalEarnings, totalDeductions, netAmount) {
        await db.run(
            'UPDATE fnf_settlements SET total_earnings = ?, total_deductions = ?, net_amount = ? WHERE id = ?',
            [totalEarnings, totalDeductions, netAmount, id]
        );
    },

    async remove(id) {
        await db.run('DELETE FROM fnf_settlements WHERE id = ?', [id]);
    },

    async listItems(settlementId) {
        return db.all('SELECT * FROM fnf_settlement_items WHERE settlement_id = ? ORDER BY id', [settlementId]);
    },

    async addItem(settlementId, item) {
        const { insertId } = await db.run(
            'INSERT INTO fnf_settlement_items (settlement_id, type, description, actual_amount, modified_amount, tds_ref) VALUES (?,?,?,?,?,?)',
            [settlementId, item.type, item.description, item.actual_amount || 0, item.modified_amount ?? item.actual_amount ?? 0, item.tds_ref || null]
        );
        return db.get('SELECT * FROM fnf_settlement_items WHERE id = ?', [insertId]);
    },

    async updateItem(id, item) {
        await db.run(
            'UPDATE fnf_settlement_items SET description = ?, modified_amount = ?, tds_ref = ? WHERE id = ?',
            [item.description, item.modified_amount, item.tds_ref || null, id]
        );
        return db.get('SELECT * FROM fnf_settlement_items WHERE id = ?', [id]);
    },

    async removeItem(id) {
        await db.run('DELETE FROM fnf_settlement_items WHERE id = ?', [id]);
    },

    // Latest payroll record for the employee — seeds "Include last month salary" items.
    async lastPayrollRecord(employeeId) {
        return db.get(
            'SELECT * FROM payroll WHERE employee_id = ? ORDER BY pay_period_end DESC LIMIT 1',
            [employeeId]
        );
    },

    async pendingLoans(employeeId) {
        return db.all("SELECT * FROM loans WHERE employee_id = ? AND status = 'Active' AND balance > 0", [employeeId]);
    },
};

module.exports = FnfSettlement;
