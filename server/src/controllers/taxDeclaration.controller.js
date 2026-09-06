const service = require('../services/taxDeclaration.service');

module.exports = {
    listByEmployee: async (req, res) => {
        res.json(await service.listByEmployee(req.params.employeeId));
    },
    listAll: async (req, res) => {
        res.json(await service.listAll(req.query));
    },
    get: async (req, res) => {
        res.json(await service.get(req.params.id));
    },
    save: async (req, res) => {
        res.status(201).json(await service.save(req.body || {}));
    },
    submit: async (req, res) => {
        res.json(await service.submit(req.params.id));
    },
    review: async (req, res) => {
        res.json(await service.review(req.params.id, req.body || {}));
    },
    remove: async (req, res) => {
        await service.remove(req.params.id);
        res.status(204).end();
    },
};
