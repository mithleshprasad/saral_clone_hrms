const genericModel = require('./genericModel');

module.exports = genericModel(
    'salary_structures',
    ['company_id', 'name', 'description', 'is_active'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
