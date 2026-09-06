const dashboardService = require('../services/dashboard.service');

module.exports = {
    stats: async (req, res) => {
        res.json(await dashboardService.stats(req.query.companyId));
    },
    employeeStats: async (req, res) => {
        res.json(await dashboardService.employeeStats(req.query.companyId));
    },
    payrollStats: async (req, res) => {
        res.json(await dashboardService.payrollStats(req.query.companyId));
    },
};
