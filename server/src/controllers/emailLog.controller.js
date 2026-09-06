const service = require('../services/emailLog.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list(req.query.companyId));
    },
};
