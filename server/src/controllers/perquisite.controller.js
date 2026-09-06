const service = require('../services/perquisite.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list({ companyId: req.query.companyId, financialYear: req.query.financialYear }));
    },
    listByEmployee: async (req, res) => {
        res.json(await service.listByEmployee(req.params.employeeId, req.query.financialYear));
    },
    create: async (req, res) => {
        res.status(201).json(await service.create(req.body || {}));
    },
    remove: async (req, res) => {
        await service.remove(req.params.id);
        res.status(204).end();
    },
    form12Ba: async (req, res) => {
        await service.streamForm12Ba(res, { employeeId: req.params.employeeId, financialYear: req.query.financialYear });
    },
};
