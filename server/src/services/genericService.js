const ApiError = require('../utils/ApiError');

/**
 * Business-logic wrapper around a genericModel: adds not-found checks. Resource-specific
 * services can start from this and layer extra validation/rules on top (see employee.service.js).
 */
function genericService(model, resourceName = 'Record') {
    return {
        model,

        async list(filterValue) {
            return model.findAll(filterValue);
        },

        async get(id) {
            const row = await model.findById(id);
            if (!row) throw ApiError.notFound(`${resourceName} not found`);
            return row;
        },

        async create(data) {
            return model.create(data);
        },

        async update(id, data) {
            const existing = await model.findById(id);
            if (!existing) throw ApiError.notFound(`${resourceName} not found`);
            return model.update(id, data);
        },

        async remove(id) {
            await model.remove(id);
        },
    };
}

module.exports = genericService;
