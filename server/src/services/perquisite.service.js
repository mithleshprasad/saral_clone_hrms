const Perquisite = require('../models/Perquisite.model');
const Employee = require('../models/Employee.model');
const Company = require('../models/Company.model');
const pdfService = require('./pdf.service');
const ApiError = require('../utils/ApiError');

const VALID_TYPES = ['Accommodation', 'Motor Car', 'ESOP', 'Concessional Loan', 'Club Membership', 'Gifts/Vouchers', 'Other'];

module.exports = {
    async list({ companyId, financialYear } = {}) {
        return Perquisite.list({ companyId, financialYear });
    },

    async listByEmployee(employeeId, financialYear) {
        return Perquisite.list({ employeeId, financialYear });
    },

    async create(data) {
        if (!data.employee_id || !data.financial_year || !data.perquisite_type || data.value === undefined) {
            throw ApiError.badRequest('employee_id, financial_year, perquisite_type and value are required');
        }
        if (!VALID_TYPES.includes(data.perquisite_type)) {
            throw ApiError.badRequest(`perquisite_type must be one of: ${VALID_TYPES.join(', ')}`);
        }
        if (Number(data.value) <= 0) throw ApiError.badRequest('value must be greater than zero');
        const employee = await Employee.findById(data.employee_id);
        if (!employee) throw ApiError.notFound('Employee not found');
        return Perquisite.create(data);
    },

    async remove(id) {
        const row = await Perquisite.findById(id);
        if (!row) throw ApiError.notFound('Perquisite entry not found');
        await Perquisite.remove(id);
    },

    // Form 12BA — statement of perquisites, other fringe benefits and profits in lieu of
    // salary (Rule 26A), streamed as a PDF annexure the same way Form 16 is: a
    // correctly-computed document from what's on file, not a TRACES-signed original.
    async streamForm12Ba(res, { employeeId, financialYear }) {
        if (!employeeId || !financialYear) throw ApiError.badRequest('employeeId and financialYear are required');
        const employee = await Employee.findById(employeeId);
        if (!employee) throw ApiError.notFound('Employee not found');
        const company = employee.company_id ? await Company.findById(employee.company_id) : null;
        const rows = await Perquisite.list({ employeeId, financialYear });
        if (rows.length === 0) throw ApiError.notFound('No perquisites recorded for this employee/financial year');

        pdfService.streamForm12Ba(res, { employee, company, financialYear, perquisites: rows });
    },
};
