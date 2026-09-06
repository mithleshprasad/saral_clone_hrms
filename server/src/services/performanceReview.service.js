const genericService = require('./genericService');
const PerformanceReview = require('../models/PerformanceReview.model');
const ApiError = require('../utils/ApiError');

const base = genericService(PerformanceReview, 'Performance review');

module.exports = {
    ...base,

    async initiate(data) {
        if (!data.employee_id || !data.review_period) throw ApiError.badRequest('employee_id and review_period are required');
        return PerformanceReview.create({ ...data, status: 'Draft' });
    },

    async submitManagerReview(id, { manager_rating, manager_comments }) {
        if (!(await PerformanceReview.findById(id))) throw ApiError.notFound('Review not found');
        return PerformanceReview.update(id, { manager_rating, manager_comments, status: 'Reviewed' });
    },
};
