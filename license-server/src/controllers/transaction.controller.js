const service = require('../services/transaction.service');

module.exports = {
    listAll: async (req, res) => res.json(await service.list()),
    listForLicense: async (req, res) => res.json(await service.listForLicense(req.params.id)),
    record: async (req, res) => res.status(201).json(await service.record(req.params.id, req.body || {})),
};
