const db = require('../config/db');

const Attendance = {
    async paginate({ page = 1, limit = 50, employeeId, companyId, search, date, startDate, endDate }) {
        const offset = (page - 1) * limit;
        const where = [];
        const params = [];

        if (employeeId) { where.push('a.employee_id = ?'); params.push(employeeId); }
        if (date) {
            where.push('a.date = ?'); params.push(date);
        } else if (startDate && endDate) {
            where.push('a.date BETWEEN ? AND ?'); params.push(startDate, endDate);
        }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (search) {
            where.push('(e.first_name LIKE ? OR e.last_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const countRow = await db.get(
            `SELECT COUNT(*) as c FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id ${whereSQL}`,
            params
        );
        const total = countRow ? countRow.c : 0;

        const rows = await db.all(
            `SELECT a.*, e.first_name, e.last_name
             FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id
             ${whereSQL}
             ORDER BY a.date DESC, e.first_name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    },

    async findById(id) {
        return db.get('SELECT * FROM attendance WHERE id = ?', [id]);
    },

    async findByEmployeeDate(employeeId, date) {
        return db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [employeeId, date]);
    },

    async create(d) {
        const { insertId } = await db.run(
            `INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, shift_id, overtime_hours)
             VALUES (?,?,?,?,?,?,?)`,
            [d.employee_id, d.date, d.check_in_time || null, d.check_out_time || null, d.status || null, d.shift_id || null, d.overtime_hours || 0]
        );
        return this.findById(insertId);
    },

    async upsertManual(d) {
        const existing = await this.findByEmployeeDate(d.employee_id, d.date);
        if (existing) {
            await db.run(
                'UPDATE attendance SET check_in_time=?, check_out_time=?, status=?, overtime_hours=0 WHERE id=?',
                [d.check_in_time || null, d.check_out_time || null, d.status, existing.id]
            );
            return this.findById(existing.id);
        }
        const { insertId } = await db.run(
            'INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, overtime_hours) VALUES (?,?,?,?,?,0)',
            [d.employee_id, d.date, d.check_in_time || null, d.check_out_time || null, d.status]
        );
        return this.findById(insertId);
    },

    async bulkUpsert(rows) {
        const conn = await db.pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const r of rows) {
                await conn.query(
                    `INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, shift_id, overtime_hours, remarks)
                     VALUES (?,?,?,?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
                        check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
                        shift_id = COALESCE(VALUES(shift_id), shift_id),
                        overtime_hours = COALESCE(VALUES(overtime_hours), overtime_hours),
                        remarks = VALUES(remarks)`,
                    [r.employee_id, r.date, r.check_in_time || null, r.check_out_time || null, r.status || null, r.shift_id || null, r.overtime_hours || 0, r.remarks || null]
                );
            }
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    async update(id, d) {
        await db.run(
            'UPDATE attendance SET check_in_time=?, check_out_time=?, status=?, shift_id=?, overtime_hours=? WHERE id=?',
            [d.check_in_time || null, d.check_out_time || null, d.status || null, d.shift_id || null, d.overtime_hours || 0, id]
        );
        return this.findById(id);
    },

    async remove(id) {
        await db.run('DELETE FROM attendance WHERE id = ?', [id]);
    },

    async checkIn(employeeId, date, timestamp) {
        await db.run(
            "INSERT INTO attendance (employee_id, date, check_in_time, status) VALUES (?, ?, ?, 'Present')",
            [employeeId, date, timestamp]
        );
    },

    async checkOut(employeeId, date, timestamp) {
        await db.run('UPDATE attendance SET check_out_time=? WHERE employee_id=? AND date=?', [timestamp, employeeId, date]);
    },
};

module.exports = Attendance;
