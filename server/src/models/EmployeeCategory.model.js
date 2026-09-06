const genericModel = require('./genericModel');

module.exports = genericModel(
    'employee_categories',
    ['company_id', 'name', 'description'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
