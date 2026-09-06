const db = require('../config/db');

const AuditLog = {
    async create({ companyId, userId, username, action, entityType, entityId, summary }) {
        await db.run(
            'INSERT INTO audit_log (company_id, user_id, username, action, entity_type, entity_id, summary) VALUES (?,?,?,?,?,?,?)',
            [companyId || null, userId || null, username || null, action, entityType, entityId || null, summary || null]
        );
    },

    async list({ companyId, entityType, limit = 200 } = {}) {
        const where = [];
        const params = [];
        if (companyId) { where.push('company_id = ?'); params.push(companyId); }
        if (entityType) { where.push('entity_type = ?'); params.push(entityType); }
        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        return db.all(
            `SELECT * FROM audit_log ${whereSQL} ORDER BY created_at DESC LIMIT ?`,
            [...params, limit]
        );
    },
};

module.exports = AuditLog;
