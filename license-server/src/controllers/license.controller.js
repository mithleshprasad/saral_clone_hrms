const service = require('../services/license.service');

module.exports = {
    list: async (req, res) => res.json(await service.list()),
    create: async (req, res) => res.status(201).json(await service.create(req.body || {})),
    update: async (req, res) => res.json(await service.update(req.params.id, req.body || {})),
    suspend: async (req, res) => res.json(await service.setStatus(req.params.id, 'Suspended')),
    revoke: async (req, res) => res.json(await service.setStatus(req.params.id, 'Revoked')),
    reactivate: async (req, res) => res.json(await service.setStatus(req.params.id, 'Active')),
    remove: async (req, res) => { await service.remove(req.params.id); res.status(204).end(); },

    // Public — no vendor auth. Called by deployed client server/ instances.
    validate: async (req, res) => {
        const { licenseKey } = req.body || {};
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        res.json(await service.validate(licenseKey, ip));
    },

    // Public — no vendor auth. Called by the marketing site's self-serve signup form.
    signup: async (req, res) => res.status(201).json(await service.signup(req.body || {})),
};
