const service = require('../services/auditLog.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list({ companyId: req.query.companyId, entityType: req.query.entityType }));
    },
};
