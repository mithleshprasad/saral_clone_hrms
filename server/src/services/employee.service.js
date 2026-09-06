const xlsx = require('xlsx');
const Employee = require('../models/Employee.model');
const ApiError = require('../utils/ApiError');
const subscriptionGuard = require('./subscriptionGuard.service');
const licenseGuard = require('./licenseGuard.service');

// Column headers accepted in the bulk-import spreadsheet, mapped to employee fields.
// Matching is case-insensitive and ignores spaces, so "First Name" / "first_name" both work.
const IMPORT_COLUMN_MAP = {
    firstname: 'first_name', lastname: 'last_name', email: 'email', phone: 'phone',
    employeecode: 'employee_code', dateofjoining: 'date_of_joining', gender: 'gender',
    dob: 'dob', basesalary: 'base_salary', darate: 'da_rate', hrarate: 'hra_rate',
    conveyanceallowance: 'conveyance_allowance', medicalallowance: 'medical_allowance',
    panno: 'pan_number', pannumber: 'pan_number', aadhaar: 'aadhaar_number',
    bankname: 'bank_name', accountnumber: 'account_number', ifsccode: 'ifsc_code',
};

function normalizeKey(k) {
    return String(k).toLowerCase().replace(/[\s_-]/g, '');
}

module.exports = {
    async list(query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        return Employee.paginate({ ...query, page, limit });
    },

    async get(id) {
        const emp = await Employee.findById(id);
        if (!emp) throw ApiError.notFound('Employee not found');
        return emp;
    },

    async create(data) {
        if (!data.first_name || !data.first_name.trim()) throw ApiError.badRequest('First name is required');
        if (!data.last_name || !data.last_name.trim()) throw ApiError.badRequest('Last name is required');
        await subscriptionGuard.assertCanAddEmployee(data.company_id);
        await licenseGuard.assertCanAddEmployee();
        return Employee.create(data);
    },

    async update(id, data) {
        if (!(await Employee.exists(id))) throw ApiError.notFound('Employee not found');
        if ('first_name' in data && !String(data.first_name).trim()) throw ApiError.badRequest('First name is required');
        if ('last_name' in data && !String(data.last_name).trim()) throw ApiError.badRequest('Last name is required');
        return Employee.update(id, data);
    },

    async remove(id) {
        await Employee.remove(id);
    },

    // Parses an uploaded .xlsx/.csv buffer and bulk-creates employees. Rows missing a
    // first/last name are skipped and reported rather than aborting the whole import.
    async bulkImport(fileBuffer, { companyId }) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
        if (rows.length === 0) throw ApiError.badRequest('The uploaded file has no data rows');

        let created = 0;
        const skipped = [];

        for (let i = 0; i < rows.length; i++) {
            const raw = rows[i];
            const mapped = {};
            for (const [key, value] of Object.entries(raw)) {
                const field = IMPORT_COLUMN_MAP[normalizeKey(key)];
                if (field) mapped[field] = value;
            }
            if (!mapped.first_name || !mapped.last_name) {
                skipped.push({ row: i + 2, reason: 'Missing first_name/last_name' });
                continue;
            }
            if (companyId) mapped.company_id = companyId;
            try {
                await subscriptionGuard.assertCanAddEmployee(mapped.company_id);
                await licenseGuard.assertCanAddEmployee();
                await Employee.create(mapped);
                created++;
            } catch (err) {
                skipped.push({ row: i + 2, reason: err.message });
            }
        }

        return { created, skipped, total: rows.length };
    },
};
