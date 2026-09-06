const service = require('../services/attendanceRegularization.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list({ companyId: req.query.companyId, status: req.query.status }));
    },
    create: async (req, res) => {
        res.status(201).json(await service.request(req.body || {}));
    },
    review: async (req, res) => {
        const { status, remarks } = req.body || {};
        res.json(await service.review(req.params.id, status, remarks, req.user.id));
    },
};
