const employeeService = require('../services/employee.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    list: async (req, res) => {
        res.json(await employeeService.list(req.query));
    },
    get: async (req, res) => {
        res.json(await employeeService.get(req.params.id));
    },
    create: async (req, res) => {
        const employee = await employeeService.create(req.body || {});
        auditLog.record({
            companyId: employee.company_id, userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'Employee', entityId: employee.id,
            summary: `Created employee "${employee.first_name} ${employee.last_name}"`,
        });
        res.status(201).json(employee);
    },
    update: async (req, res) => {
        const employee = await employeeService.update(req.params.id, req.body || {});
        auditLog.record({
            companyId: employee.company_id, userId: req.user.id, username: req.user.username,
            action: 'Update', entityType: 'Employee', entityId: employee.id,
            summary: `Updated employee "${employee.first_name} ${employee.last_name}" (${Object.keys(req.body || {}).join(', ')})`,
        });
        res.json(employee);
    },
    remove: async (req, res) => {
        const employee = await employeeService.get(req.params.id);
        await employeeService.remove(req.params.id);
        auditLog.record({
            companyId: employee?.company_id, userId: req.user.id, username: req.user.username,
            action: 'Delete', entityType: 'Employee', entityId: req.params.id,
            summary: `Deleted employee "${employee?.first_name} ${employee?.last_name}"`,
        });
        res.status(204).end();
    },
    bulkImport: async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });
        const result = await employeeService.bulkImport(req.file.buffer, { companyId: req.body.companyId });
        auditLog.record({
            companyId: req.body.companyId, userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'Employee', entityId: null,
            summary: `Bulk-imported ${result.created} of ${result.total} employees from Excel`,
        });
        res.json(result);
    },
};
