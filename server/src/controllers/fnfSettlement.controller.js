const service = require('../services/fnfSettlement.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list({ employeeId: req.query.employeeId, companyId: req.query.companyId }));
    },
    get: async (req, res) => {
        res.json(await service.get(req.params.id));
    },
    create: async (req, res) => {
        res.status(201).json(await service.create(req.body || {}));
    },
    update: async (req, res) => {
        res.json(await service.update(req.params.id, req.body || {}));
    },
    remove: async (req, res) => {
        await service.remove(req.params.id);
        res.status(204).end();
    },
    addItem: async (req, res) => {
        res.status(201).json(await service.addItem(req.params.id, req.body || {}));
    },
    updateItem: async (req, res) => {
        res.json(await service.updateItem(req.params.id, req.params.itemId, req.body || {}));
    },
    removeItem: async (req, res) => {
        res.json(await service.removeItem(req.params.id, req.params.itemId));
    },
    finalize: async (req, res) => {
        res.json(await service.finalize(req.params.id));
    },
};
