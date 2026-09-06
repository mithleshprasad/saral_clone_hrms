const genericController = require('./genericController');
const performanceReviewService = require('../services/performanceReview.service');

module.exports = {
    ...genericController(performanceReviewService),
    initiate: async (req, res) => {
        res.status(201).json(await performanceReviewService.initiate(req.body || {}));
    },
    submitManagerReview: async (req, res) => {
        res.json(await performanceReviewService.submitManagerReview(req.params.id, req.body || {}));
    },
};
