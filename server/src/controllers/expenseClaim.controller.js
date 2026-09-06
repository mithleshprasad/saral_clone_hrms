const service = require('../services/expenseClaim.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.list({ companyId: req.query.companyId, status: req.query.status }));
    },
    review: async (req, res) => {
        const { status, remarks } = req.body || {};
        const claim = await service.review(req.params.id, status, remarks, req.user.id);
        auditLog.record({
            userId: req.user.id, username: req.user.username,
            action: 'Update', entityType: 'ExpenseClaim', entityId: claim.id,
            summary: `${status} expense claim #${claim.id} (${claim.category}, ₹${claim.amount}) for employee #${claim.employee_id}`,
        });
        res.json(claim);
    },
    downloadReceipt: async (req, res) => {
        const { claim, filePath } = await service.getReceiptForDownload(req.params.id);
        res.download(filePath, claim.receipt_original_name);
    },
};
