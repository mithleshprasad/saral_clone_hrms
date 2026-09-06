const AuditLog = require('../models/AuditLog.model');

module.exports = {
    // Never allowed to throw into the caller's request — an audit-log write failing must
    // not roll back or fail the actual operation being logged.
    async record(entry) {
        try {
            await AuditLog.create(entry);
        } catch (err) {
            console.error('[auditLog] Failed to record entry:', err.message);
        }
    },

    async list(query) {
        return AuditLog.list(query);
    },
};
