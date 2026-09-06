const genericService = require('./genericService');
const Position = require('../models/Position.model');

const base = genericService(Position, 'Position');

module.exports = {
    ...base,
    // Overrides the generic single-filterColumn list: positions are filterable by both
    // company_id (the Positions master screen, company-wide) and department_id (the
    // Employee form's cascading Designation dropdown, which needs just one department's).
    async list({ companyId, departmentId } = {}) {
        return Position.findAll({ companyId, departmentId });
    },
};
