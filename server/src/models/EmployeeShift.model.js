const db = require('../config/db');

const EmployeeShift = {
    async list({ companyId, employeeId, shiftId, from, to } = {}) {
        const where = [];
        const params = [];
        if (employeeId) { where.push('es.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (shiftId) { where.push('es.shift_id = ?'); params.push(shiftId); }
        if (from) { where.push('es.date >= ?'); params.push(from); }
        if (to) { where.push('es.date <= ?'); params.push(to); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        return db.all(
            `SELECT es.*, e.first_name, e.last_name, e.employee_code, s.name as shift_name, s.start_time, s.end_time
             FROM employee_shifts es
             JOIN employees e ON es.employee_id = e.id
             JOIN shifts s ON es.shift_id = s.id
             ${whereSQL}
             ORDER BY es.date, e.first_name`,
            params
        );
    },

    // One row per employee per date (schema's UNIQUE KEY) — re-assigning a date just
    // overwrites which shift it points to, matching how a roster correction works in
    // practice (you don't want a history of every edit, just today's assignment).
    async upsert({ employee_id, shift_id, date }) {
        await db.run(
            `INSERT INTO employee_shifts (employee_id, shift_id, date) VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id)`,
            [employee_id, shift_id, date]
        );
        return db.get(
            `SELECT es.*, e.first_name, e.last_name, e.employee_code, s.name as shift_name
             FROM employee_shifts es JOIN employees e ON es.employee_id = e.id JOIN shifts s ON es.shift_id = s.id
             WHERE es.employee_id = ? AND es.date = ?`,
            [employee_id, date]
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM employee_shifts WHERE id = ?', [id]);
    },

    async remove(id) {
        await db.run('DELETE FROM employee_shifts WHERE id = ?', [id]);
    },
};

module.exports = EmployeeShift;
