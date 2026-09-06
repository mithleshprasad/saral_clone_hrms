const db = require('../config/db');
const genericModel = require('./genericModel');

const base = genericModel(
    'tickets',
    ['employee_id', 'category', 'priority', 'subject', 'description', 'status'],
    { orderBy: 'created_at DESC', filterColumn: 'company_id' }
);

module.exports = {
    ...base,

    async findAll(companyId) {
        const where = companyId ? 'WHERE e.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(
            `SELECT t.*, e.first_name, e.last_name FROM tickets t
             LEFT JOIN employees e ON t.employee_id = e.id
             ${where}
             ORDER BY t.created_at DESC`,
            params
        );
    },

    async setStatus(id, status) {
        await db.run('UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
        return base.findById(id);
    },
};
