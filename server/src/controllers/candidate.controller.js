const genericController = require('./genericController');
const candidateService = require('../services/candidate.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    ...genericController(candidateService),
    updateStatus: async (req, res) => {
        res.json(await candidateService.updateStatus(req.params.id, req.body?.status));
    },
    convert: async (req, res) => {
        const result = await candidateService.convert(req.params.id, {
            generatedBy: req.user.id, letterType: req.body?.letterType,
        });
        auditLog.record({
            companyId: result.employee.company_id, userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'Employee', entityId: result.employee.id,
            summary: `Converted candidate "${result.candidate.name}" to employee "${result.employee.first_name} ${result.employee.last_name}"${result.letter ? ` and generated a ${result.letter.type} letter` : ''}`,
        });
        res.status(201).json(result);
    },
};
