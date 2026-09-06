const genericController = require('./genericController');
const positionService = require('../services/position.service');

module.exports = {
    ...genericController(positionService),
    // The generic list() only ever reads one query param (model.filterColumn); positions
    // need both company_id and department_id read independently — see position.service.js.
    list: async (req, res) => {
        res.json(await positionService.list({ companyId: req.query.company_id, departmentId: req.query.department_id }));
    },
};
