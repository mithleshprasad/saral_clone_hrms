const leaveService = require('../services/leave.service');

module.exports = {
    list: async (req, res) => {
        res.json(await leaveService.list(req.query));
    },
    request: async (req, res) => {
        res.status(201).json(await leaveService.request(req.body || {}));
    },
    updateStatus: async (req, res) => {
        res.json(await leaveService.updateStatus(req.params.id, req.body?.status));
    },
    getBalance: async (req, res) => {
        const year = parseInt(req.query.year || new Date().getFullYear(), 10);
        res.json(await leaveService.getBalance(req.params.employeeId, year));
    },
    setBalance: async (req, res) => {
        res.json(await leaveService.setBalance(req.body || {}));
    },
};
