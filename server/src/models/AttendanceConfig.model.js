const genericModel = require('./genericModel');

module.exports = genericModel(
    'attendance_configs',
    ['company_id', 'name', 'salary_calculation', 'overtime1_enabled', 'overtime2_enabled', 'standard_hours_per_day', 'overtime_rate_multiplier', 'nwd_type', 'register_type', 'allow_more_than_working_days', 'remarks'],
    { orderBy: 'name', filterColumn: 'company_id' }
);
