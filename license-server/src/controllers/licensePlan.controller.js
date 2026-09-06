const service = require('../services/licensePlan.service');

module.exports = {
    list: async (req, res) => res.json(await service.list()),
    create: async (req, res) => res.status(201).json(await service.create(req.body || {})),
    update: async (req, res) => res.json(await service.update(req.params.id, req.body || {})),
    remove: async (req, res) => { await service.remove(req.params.id); res.status(204).end(); },
};
