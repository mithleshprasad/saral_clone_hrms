const AttendanceRegularization = require('../models/AttendanceRegularization.model');
const Attendance = require('../models/Attendance.model');
const ApiError = require('../utils/ApiError');

const VALID_STATUSES = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];

module.exports = {
    async list({ companyId, status } = {}) {
        return AttendanceRegularization.list({ companyId, status });
    },

    async listByEmployee(employeeId) {
        return AttendanceRegularization.list({ employeeId });
    },

    async request(data) {
        if (!data.employee_id || !data.date || !data.requested_status) {
            throw ApiError.badRequest('employee_id, date and requested_status are required');
        }
        if (!VALID_STATUSES.includes(data.requested_status)) {
            throw ApiError.badRequest(`requested_status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        return AttendanceRegularization.create(data);
    },

    // Approving applies the correction straight to that day's attendance record (creating
    // it if none exists yet); rejecting or re-reviewing never touches attendance.
    async review(id, status, remarks, reviewedBy) {
        if (!['Approved', 'Rejected'].includes(status)) {
            throw ApiError.badRequest('status must be Approved or Rejected');
        }
        const reg = await AttendanceRegularization.findById(id);
        if (!reg) throw ApiError.notFound('Regularization request not found');

        if (status === 'Approved') {
            await Attendance.upsertManual({
                employee_id: reg.employee_id,
                date: reg.date,
                status: reg.requested_status,
            });
        }

        return AttendanceRegularization.setStatus(id, status, remarks, reviewedBy);
    },
};
