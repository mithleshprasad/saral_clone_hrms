const genericModel = require('./genericModel');

module.exports = genericModel(
    'user_defined_deductions',
    ['company_id', 'name', 'code', 'calc_type', 'amount', 'is_active'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
