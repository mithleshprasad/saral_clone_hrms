const genericModel = require('./genericModel');

module.exports = genericModel(
    'holidays',
    ['company_id', 'name', 'date', 'type'],
    { orderBy: 'date', filterColumn: 'company_id' }
);
