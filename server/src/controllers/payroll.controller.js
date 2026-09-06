const payrollService = require('../services/payroll.service');
const pdfService = require('../services/pdf.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    generate: async (req, res) => {
        const body = req.body || {};
        const result = await payrollService.generatePayroll(body);
        auditLog.record({
            companyId: body.companyId, userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'Payroll', entityId: null,
            summary: `Generated payroll for ${body.startDate} to ${body.endDate}: ${result.processed} processed, ${result.skipped?.length || 0} skipped, ${result.blocked?.length || 0} blocked`,
        });
        res.json(result);
    },
    list: async (req, res) => {
        res.json(await payrollService.list(req.query));
    },
    get: async (req, res) => {
        res.json(await payrollService.get(req.params.id));
    },
    downloadPayslip: async (req, res) => {
        const data = await payrollService.getPayslipData(req.params.id);
        pdfService.streamPayslip(res, data);
    },
    downloadForm16: async (req, res) => {
        const data = await payrollService.getForm16Data(req.params.employeeId, req.query.financialYear);
        pdfService.streamForm16(res, data);
    },
    remove: async (req, res) => {
        const payslip = await payrollService.get(req.params.id);
        await payrollService.remove(req.params.id);
        auditLog.record({
            userId: req.user.id, username: req.user.username,
            action: 'Delete', entityType: 'Payroll', entityId: req.params.id,
            summary: `Deleted payslip for ${payslip?.first_name} ${payslip?.last_name} (${payslip?.pay_period_start} to ${payslip?.pay_period_end})`,
        });
        res.status(204).end();
    },
    updateComponents: async (req, res) => {
        const updated = await payrollService.updateComponents(req.params.id, req.body || {});
        auditLog.record({
            userId: req.user.id, username: req.user.username,
            action: 'Update', entityType: 'Payroll', entityId: req.params.id,
            summary: `Edited payslip components for ${updated?.first_name} ${updated?.last_name} (${Object.keys(req.body || {}).join(', ')})`,
        });
        res.json(updated);
    },
    report: async (req, res) => {
        res.json(await payrollService.report(req.params.type, req.query));
    },
    listMonths: async (req, res) => {
        res.json(await payrollService.listMonths(req.query.companyId));
    },
    createMonth: async (req, res) => {
        const { companyId, year, month } = req.body || {};
        res.status(201).json(await payrollService.createMonth(companyId, year, month));
    },
    closeMonth: async (req, res) => {
        res.json(await payrollService.closeMonth(req.params.id));
    },
    reopenMonth: async (req, res) => {
        res.json(await payrollService.reopenMonth(req.params.id));
    },
};
