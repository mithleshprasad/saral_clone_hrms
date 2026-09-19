const service = require('../services/googleSync.service');

module.exports = {
    generateTemplate: async (req, res) => {
        const secret = service.generateSecret();
        res.json({ secret, scriptCode: service.getAppsScriptTemplate(secret) });
    },
    testConnection: async (req, res) => {
        const { scriptUrl, secret } = req.body || {};
        res.json(await service.testConnection(scriptUrl, secret));
    },
    addConnection: async (req, res) => res.status(201).json(await service.addConnection(req.body || {})),
    listConnections: async (req, res) => res.json(await service.listConnections(req.query.companyId)),
    refreshConnectionTabs: async (req, res) => res.json(await service.refreshConnectionTabs(req.params.id)),
    getTabHeaders: async (req, res) => res.json(await service.getTabHeaders(req.query.connectionId, req.query.tab)),
    deleteConnection: async (req, res) => { await service.deleteConnection(req.params.id); res.status(204).end(); },

    getSyncableTables: async (req, res) => res.json(service.getSyncableTables()),
    saveMapping: async (req, res) => res.status(201).json(await service.saveMapping(req.body || {})),
    listMappings: async (req, res) => res.json(await service.listMappings(req.query.companyId)),
    deleteMapping: async (req, res) => { await service.deleteMapping(req.params.id); res.status(204).end(); },
    runSync: async (req, res) => res.json(await service.runSync(req.params.id)),

    getReviewQueue: async (req, res) => res.json(await service.getReviewQueue(req.query.companyId, req.query.mappingId)),
    approveReviewItem: async (req, res) => res.json(await service.approveReviewItem(req.params.id)),
    rejectReviewItem: async (req, res) => res.json(await service.rejectReviewItem(req.params.id)),
};
