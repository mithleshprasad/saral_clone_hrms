const service = require('../services/paymentSettings.service');

module.exports = {
    get: async (req, res) => res.json(await service.get()),
    update: async (req, res) => res.json(await service.update(req.body || {})),
};
