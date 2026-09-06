const genericModel = require('./genericModel');

module.exports = genericModel(
    'candidates',
    ['job_id', 'name', 'email', 'phone', 'status', 'notes', 'resume_path', 'converted_employee_id'],
    { orderBy: 'created_at DESC', filterColumn: 'job_id' }
);
