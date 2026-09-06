const genericService = require('./genericService');
const Candidate = require('../models/Candidate.model');
const Job = require('../models/Job.model');
const employeeService = require('./employee.service');
const letterService = require('./letter.service');
const ApiError = require('../utils/ApiError');

const base = genericService(Candidate, 'Candidate');

module.exports = {
    ...base,
    // genericModel's create() sends an explicit NULL for any omitted field rather than
    // leaving the column out of the INSERT — which bypasses the schema's own
    // `DEFAULT 'Applied'` entirely (an explicit NULL always wins over a column default).
    // The UI never sends a status when adding a candidate, so this default has to be
    // applied here or every new candidate silently starts with status = NULL.
    async create(data) {
        return base.create({ ...data, status: data.status || 'Applied' });
    },
    async updateStatus(id, status) {
        if (!(await Candidate.findById(id))) throw ApiError.notFound('Candidate not found');
        return Candidate.update(id, { status });
    },

    // The audit-report gap this closes: an offer/appointment letter used to be a fully
    // standalone action against an already-existing employee. This ties letter generation
    // to the actual hire decision — converting a candidate creates the employee record
    // (mapping job.company_id/department_id, splitting candidate.name into first/last) and,
    // in the same action, generates the letter against that brand-new record.
    async convert(id, { generatedBy, letterType = 'Offer' } = {}) {
        const candidate = await Candidate.findById(id);
        if (!candidate) throw ApiError.notFound('Candidate not found');
        if (candidate.converted_employee_id) throw ApiError.conflict('This candidate has already been converted to an employee');

        const job = candidate.job_id ? await Job.findById(candidate.job_id) : null;
        if (!job || !job.company_id) {
            throw ApiError.badRequest("This candidate's job posting has no company set — cannot determine which company to create the employee under");
        }

        const nameParts = String(candidate.name || '').trim().split(/\s+/).filter(Boolean);
        const first_name = nameParts[0] || 'Candidate';
        const last_name = nameParts.slice(1).join(' ') || '-';

        const employee = await employeeService.create({
            first_name, last_name,
            email: candidate.email || undefined, phone: candidate.phone || undefined,
            company_id: job.company_id, department_id: job.department_id || undefined,
        });

        await Candidate.update(id, { status: 'Hired', converted_employee_id: employee.id });

        let letter = null;
        if (letterType) {
            letter = await letterService.generate({ employee_id: employee.id, type: letterType, generated_by: generatedBy });
        }

        return { employee, letter, candidate: await Candidate.findById(id) };
    },
};
