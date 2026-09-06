/**
 * Express handlers around a genericService. Routes wrap each of these in asyncHandler.
 */
function genericController(service) {
    return {
        list: async (req, res) => {
            const filterValue = service.model.filterColumn ? req.query[service.model.filterColumn] : undefined;
            res.json(await service.list(filterValue));
        },

        get: async (req, res) => {
            res.json(await service.get(req.params.id));
        },

        create: async (req, res) => {
            const created = await service.create(req.body || {});
            res.status(201).json(created);
        },

        update: async (req, res) => {
            res.json(await service.update(req.params.id, req.body || {}));
        },

        remove: async (req, res) => {
            await service.remove(req.params.id);
            res.status(204).end();
        },
    };
}

module.exports = genericController;
