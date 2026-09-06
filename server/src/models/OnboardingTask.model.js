const genericModel = require('./genericModel');

module.exports = genericModel(
    'onboarding_tasks',
    ['employee_id', 'task', 'is_completed'],
    { orderBy: 'id', filterColumn: 'employee_id' }
);
