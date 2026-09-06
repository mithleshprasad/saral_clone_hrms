const LicensePlan = require('../models/LicensePlan.model');
const ApiError = require('../utils/ApiError');

module.exports = {
    async list() {
        return LicensePlan.findAll();
    },

    async create(data) {
        if (!data.name) throw ApiError.badRequest('name is required');
        if (!Array.isArray(data.features) || data.features.length === 0) {
            throw ApiError.badRequest('features must be a non-empty array');
        }
        return LicensePlan.create(data);
    },

    async update(id, data) {
        const existing = await LicensePlan.findById(id);
        if (!existing) throw ApiError.notFound('Plan not found');
        if (!data.name) throw ApiError.badRequest('name is required');
        return LicensePlan.update(id, data);
    },

    async remove(id) {
        const existing = await LicensePlan.findById(id);
        if (!existing) throw ApiError.notFound('Plan not found');
        return LicensePlan.remove(id);
    },
};
