const db = require('../config/db');

const EmailLog = {
    async list({ companyId, limit = 100 } = {}) {
        const where = [];
        const params = [];
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        return db.all(
            `SELECT l.*, e.first_name, e.last_name
             FROM email_log l LEFT JOIN employees e ON l.employee_id = e.id
             ${whereSQL}
             ORDER BY l.created_at DESC
             LIMIT ?`,
            [...params, limit]
        );
    },
};

module.exports = EmailLog;
