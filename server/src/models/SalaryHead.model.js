const genericModel = require('./genericModel');

module.exports = genericModel(
    'salary_heads',
    [
        'company_id', 'name', 'code', 'description', 'type', 'form_16_type',
        'is_proportionate', 'consider_for_pf', 'consider_for_esi', 'consider_for_bonus',
        'consider_for_overtime', 'is_active',
    ],
    { orderBy: 'name', filterColumn: 'company_id' }
);
