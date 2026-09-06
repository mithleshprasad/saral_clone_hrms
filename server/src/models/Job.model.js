const genericModel = require('./genericModel');

module.exports = genericModel(
    'jobs',
    ['company_id', 'title', 'department_id', 'description', 'status'],
    { orderBy: 'created_at DESC', filterColumn: 'company_id' }
);
