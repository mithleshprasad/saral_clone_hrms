const genericModel = require('./genericModel');

module.exports = genericModel(
    'departments',
    ['company_id', 'name', 'description'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
