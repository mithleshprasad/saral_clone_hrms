const service = require('../services/shiftRoster.service');

module.exports = {
    list: async (req, res) => {
        const { companyId, employeeId, shiftId, from, to } = req.query;
        res.json(await service.list({ companyId, employeeId, shiftId, from, to }));
    },
    assign: async (req, res) => {
        res.status(201).json(await service.assign(req.body || {}));
    },
    remove: async (req, res) => {
        await service.remove(req.params.id);
        res.status(204).end();
    },
};
