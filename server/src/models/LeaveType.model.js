const genericModel = require('./genericModel');

module.exports = genericModel(
    'leave_types',
    [
        'company_id', 'name', 'short_code', 'max_days', 'color',
        'allotment_from_basis', 'allotment_after_months', 'allotment_after_days',
        'avail_from_basis', 'avail_after_months', 'avail_after_days',
        'auto_allotment_enabled', 'allot_type', 'year_type', 'allot_round_off', 'allot_as_per',
        'carry_over_enabled', 'carry_over_lower_limit', 'carry_over_upper_limit', 'lapse_unavailed_on', 'lapse_exceeding',
        'balance_round_off', 'encashment_enabled', 'encashment_min_balance', 'priority', 'remarks',
    ],
    { orderBy: 'priority, name', filterColumn: 'company_id' }
);
