const genericService = require('./genericService');
const OnboardingTask = require('../models/OnboardingTask.model');
const Employee = require('../models/Employee.model');
const ApiError = require('../utils/ApiError');

const base = genericService(OnboardingTask, 'Onboarding task');

module.exports = {
    ...base,
    // genericModel's create() sends an explicit NULL for any omitted field, which bypasses
    // the schema's `is_completed DEFAULT 0` entirely (same fix as candidate/job status
    // elsewhere) — and unlike perquisites, nothing here checked employee_id was real before
    // insert, so a bad id fell straight through to a raw FK-constraint 500.
    async create(data) {
        if (!(await Employee.findById(data.employee_id))) throw ApiError.notFound('Employee not found');
        return base.create({ ...data, is_completed: data.is_completed ? 1 : 0 });
    },
    async toggle(id) {
        const task = await OnboardingTask.findById(id);
        if (!task) throw ApiError.notFound('Onboarding task not found');
        return OnboardingTask.update(id, { is_completed: task.is_completed ? 0 : 1 });
    },
};
