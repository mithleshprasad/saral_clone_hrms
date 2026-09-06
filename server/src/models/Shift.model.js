const genericModel = require('./genericModel');

module.exports = genericModel(
    'shifts',
    ['company_id', 'name', 'start_time', 'end_time', 'grace_period_mins'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
