const EmailLog = require('../models/EmailLog.model');

module.exports = {
    async list(companyId) {
        return EmailLog.list({ companyId });
    },
};
