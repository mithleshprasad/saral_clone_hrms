const db = require('../config/db');
const genericModel = require('./genericModel');

const base = genericModel(
    'performance_reviews',
    ['employee_id', 'review_period', 'status', 'self_rating', 'self_comments', 'manager_rating', 'manager_comments'],
    { orderBy: 'created_at DESC', filterColumn: 'company_id' }
);

module.exports = {
    ...base,

    async findAll(companyId) {
        const where = companyId ? 'WHERE e.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(
            `SELECT r.*, e.first_name, e.last_name FROM performance_reviews r
             JOIN employees e ON r.employee_id = e.id
             ${where}
             ORDER BY r.created_at DESC`,
            params
        );
    },
};
