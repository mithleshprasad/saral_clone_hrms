const EmployeeShift = require('../models/EmployeeShift.model');
const Employee = require('../models/Employee.model');
const Shift = require('../models/Shift.model');
const ApiError = require('../utils/ApiError');

const MAX_RANGE_DAYS = 92; // ~3 months in one go — long enough for a real rotation, short enough to catch a fat-fingered date

// Builds Y-M-D from local calendar fields, not toISOString() (which converts to UTC first
// and silently shifts the date back by one on a UTC+ server) — same bug class fixed in
// attendance.service.js's punch importer earlier.
function dateToYmd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function eachDate(start, end) {
    const dates = [];
    const cur = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (cur <= last) {
        dates.push(dateToYmd(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

module.exports = {
    async list({ companyId, employeeId, shiftId, from, to } = {}) {
        return EmployeeShift.list({ companyId, employeeId, shiftId, from, to });
    },

    // Assigns one shift to one employee across a date range — expands into one
    // employee_shifts row per day (upsert, so re-assigning a day just changes its shift).
    async assign({ employee_id, shift_id, start_date, end_date }) {
        if (!employee_id || !shift_id || !start_date || !end_date) {
            throw ApiError.badRequest('employee_id, shift_id, start_date and end_date are required');
        }
        if (end_date < start_date) throw ApiError.badRequest('end_date must be on or after start_date');

        const employee = await Employee.findById(employee_id);
        if (!employee) throw ApiError.notFound('Employee not found');
        const shift = await Shift.findById(shift_id);
        if (!shift) throw ApiError.notFound('Shift not found');
        if (shift.company_id && employee.company_id && shift.company_id !== employee.company_id) {
            throw ApiError.badRequest("This shift belongs to a different company than the employee");
        }

        const dates = eachDate(start_date, end_date);
        if (dates.length > MAX_RANGE_DAYS) {
            throw ApiError.badRequest(`Date range too long (${dates.length} days) — assign in batches of ${MAX_RANGE_DAYS} days or fewer`);
        }

        let last;
        for (const date of dates) {
            last = await EmployeeShift.upsert({ employee_id, shift_id, date });
        }
        return { assigned: dates.length, sample: last };
    },

    async remove(id) {
        const row = await EmployeeShift.findById(id);
        if (!row) throw ApiError.notFound('Roster entry not found');
        await EmployeeShift.remove(id);
    },
};
