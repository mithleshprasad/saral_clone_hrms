const genericService = require('./genericService');
const Asset = require('../models/Asset.model');
const ApiError = require('../utils/ApiError');
const { todayLocal } = require('../utils/dateUtils');

const base = genericService(Asset, 'Asset');

module.exports = {
    ...base,

    async assign(id, employeeId) {
        if (!(await Asset.findById(id))) throw ApiError.notFound('Asset not found');
        if (!employeeId) throw ApiError.badRequest('employeeId is required');
        return Asset.assign(id, employeeId, todayLocal());
    },

    async returnAsset(id) {
        if (!(await Asset.findById(id))) throw ApiError.notFound('Asset not found');
        return Asset.returnAsset(id);
    },
};
