const db = require('../config/db');

const AttendanceRegularization = {
    async list({ employeeId, companyId, status } = {}) {
        const where = [];
        const params = [];
        if (employeeId) { where.push('r.employee_id = ?'); params.push(employeeId); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (status) { where.push('r.status = ?'); params.push(status); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        return db.all(
            `SELECT r.*, e.first_name, e.last_name, e.employee_code
             FROM attendance_regularizations r JOIN employees e ON r.employee_id = e.id
             ${whereSQL}
             ORDER BY r.created_at DESC`,
            params
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM attendance_regularizations WHERE id = ?', [id]);
    },

    async create(d) {
        const { insertId } = await db.run(
            "INSERT INTO attendance_regularizations (employee_id, date, requested_status, reason, status) VALUES (?,?,?,?,'Pending')",
            [d.employee_id, d.date, d.requested_status, d.reason || null]
        );
        return this.findById(insertId);
    },

    async setStatus(id, status, remarks, reviewedBy) {
        await db.run(
            'UPDATE attendance_regularizations SET status = ?, remarks = ?, reviewed_by = ? WHERE id = ?',
            [status, remarks || null, reviewedBy || null, id]
        );
        return this.findById(id);
    },
};

module.exports = AttendanceRegularization;
