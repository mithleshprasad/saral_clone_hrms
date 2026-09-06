const genericModel = require('./genericModel');

module.exports = genericModel(
    'branches',
    ['company_id', 'name', 'address', 'phone'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
