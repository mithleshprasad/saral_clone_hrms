const genericController = require('./genericController');
const companyService = require('../services/company.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    ...genericController(companyService),
    create: async (req, res) => {
        const company = await companyService.create(req.body || {});
        auditLog.record({
            companyId: company.id, userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'Company', entityId: company.id,
            summary: `Created company "${company.name}"`,
        });
        res.status(201).json(company);
    },
    update: async (req, res) => {
        const company = await companyService.update(req.params.id, req.body || {});
        auditLog.record({
            companyId: company.id, userId: req.user.id, username: req.user.username,
            action: 'Update', entityType: 'Company', entityId: company.id,
            summary: `Updated company "${company.name}" (${Object.keys(req.body || {}).join(', ')})`,
        });
        res.json(company);
    },
    remove: async (req, res) => {
        const company = await companyService.get(req.params.id);
        await companyService.remove(req.params.id);
        auditLog.record({
            companyId: req.params.id, userId: req.user.id, username: req.user.username,
            action: 'Delete', entityType: 'Company', entityId: req.params.id,
            summary: `Deleted company "${company?.name}"`,
        });
        res.status(204).end();
    },
    updateSubscription: async (req, res) => {
        const company = await companyService.updateSubscription(req.params.id, req.body || {});
        auditLog.record({
            companyId: company.id, userId: req.user.id, username: req.user.username,
            action: 'Update', entityType: 'Company', entityId: company.id,
            summary: `Updated subscription for "${company.name}" (${Object.keys(req.body || {}).join(', ')})`,
        });
        res.json(company);
    },
};
