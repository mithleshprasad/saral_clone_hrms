const SmsLog = require('../models/SmsLog.model');

module.exports = {
    async list(companyId) {
        return SmsLog.list({ companyId });
    },
};
