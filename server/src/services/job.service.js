const genericService = require('./genericService');
const Job = require('../models/Job.model');

const base = genericService(Job, 'Job');

module.exports = {
    ...base,
    // Same fix as candidate.service.js: genericModel's create() sends an explicit NULL for
    // any field the caller omits, which bypasses the schema's `DEFAULT 'Open'` entirely.
    async create(data) {
        return base.create({ ...data, status: data.status || 'Open' });
    },
};
