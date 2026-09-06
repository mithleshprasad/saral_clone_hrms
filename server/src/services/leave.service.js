const Leave = require('../models/Leave.model');
const ApiError = require('../utils/ApiError');

module.exports = {
    async list(query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        return Leave.paginate({ ...query, page, limit });
    },

    async request(data) {
        if (!data.employee_id || !data.leave_type || !data.start_date || !data.end_date) {
            throw ApiError.badRequest('employee_id, leave_type, start_date and end_date are required');
        }
        return Leave.create(data);
    },

    // Approving a leave deducts the corresponding leave_balances row (if one exists for
    // that employee/type/year); rejecting or re-approving does not double-deduct.
    async updateStatus(id, status) {
        if (!status) throw ApiError.badRequest('status is required');
        const leave = await Leave.findById(id);
        if (!leave) throw ApiError.notFound('Leave request not found');

        if (status === 'Approved' && leave.status !== 'Approved') {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const days = (end - start) / (1000 * 60 * 60 * 24) + 1;
            const year = start.getFullYear();

            const bal = await Leave.findBalanceRow(leave.employee_id, leave.leave_type, year);
            if (bal) await Leave.incrementUsed(bal.id, days);
        }

        return Leave.setStatus(id, status);
    },

    async getBalance(employeeId, year) {
        const companyId = await Leave.employeeCompanyId(employeeId);
        if (companyId === null) throw ApiError.notFound('Employee not found');
        return Leave.getBalance(employeeId, year, companyId);
    },

    async setBalance({ employee_id, leave_type, year, balance }) {
        if (!employee_id || !leave_type || !year) {
            throw ApiError.badRequest('employee_id, leave_type and year are required');
        }
        return Leave.upsertBalance(employee_id, leave_type, year, balance);
    },
};
