const db = require('../config/db');

const Leave = {
    async paginate({ page = 1, limit = 50, employeeId, companyId, search }) {
        const offset = (page - 1) * limit;
        const where = [];
        const params = [];
        if (employeeId) { where.push('l.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (search) {
            where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR l.leave_type LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const countRow = await db.get(`SELECT COUNT(*) as c FROM leaves l JOIN employees e ON l.employee_id = e.id ${whereSQL}`, params);
        const total = countRow ? countRow.c : 0;

        const rows = await db.all(
            `SELECT l.*, e.first_name, e.last_name
             FROM leaves l JOIN employees e ON l.employee_id = e.id
             ${whereSQL}
             ORDER BY l.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    },

    async findById(id) {
        return db.get('SELECT * FROM leaves WHERE id = ?', [id]);
    },

    async create(d) {
        const { insertId } = await db.run(
            "INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?,?,?,?,?,'Pending')",
            [d.employee_id, d.leave_type, d.start_date, d.end_date, d.reason || null]
        );
        return this.findById(insertId);
    },

    async setStatus(id, status) {
        await db.run('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    },

    async employeeCompanyId(employeeId) {
        const emp = await db.get('SELECT company_id FROM employees WHERE id = ?', [employeeId]);
        return emp ? emp.company_id : null;
    },

    async getBalance(employeeId, year, companyId) {
        return db.all(
            `SELECT lb.*, lt.color FROM leave_balances lb
             LEFT JOIN leave_types lt ON (lb.leave_type = lt.name AND lt.company_id = ?)
             WHERE lb.employee_id = ? AND lb.year = ?`,
            [companyId, employeeId, year]
        );
    },

    async findBalanceRow(employeeId, leaveType, year) {
        return db.get(
            'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?',
            [employeeId, leaveType, year]
        );
    },

    async incrementUsed(balanceId, days) {
        await db.run('UPDATE leave_balances SET used = used + ? WHERE id = ?', [days, balanceId]);
    },

    async upsertBalance(employeeId, leaveType, year, balance) {
        await db.run(
            `INSERT INTO leave_balances (employee_id, leave_type, year, balance)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE balance = VALUES(balance)`,
            [employeeId, leaveType, year, balance || 0]
        );
        return this.findBalanceRow(employeeId, leaveType, year);
    },
};

module.exports = Leave;
