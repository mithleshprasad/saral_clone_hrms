const service = require('../services/interview.service');

module.exports = {
    list: async (req, res) => {
        if (req.query.candidateId) return res.json(await service.listByCandidate(req.query.candidateId));
        res.json(await service.listByCompany(req.query.companyId));
    },
    schedule: async (req, res) => {
        res.status(201).json(await service.schedule(req.body || {}));
    },
    reschedule: async (req, res) => {
        res.json(await service.reschedule(req.params.id, req.body || {}));
    },
    feedback: async (req, res) => {
        res.json(await service.submitFeedback(req.params.id, req.body || {}));
    },
    setStatus: async (req, res) => {
        res.json(await service.setStatus(req.params.id, req.body?.status));
    },
    remove: async (req, res) => {
        await service.remove(req.params.id);
        res.status(204).end();
    },
};
