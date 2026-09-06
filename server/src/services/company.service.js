const genericService = require('./genericService');
const Company = require('../models/Company.model');
const LeaveType = require('../models/LeaveType.model');
const ApiError = require('../utils/ApiError');
const db = require('../config/db');
const licenseGuard = require('./licenseGuard.service');
const { DEFAULT_LEAVE_TYPES } = require('../constants');

const base = genericService(Company, 'Company');

module.exports = {
    ...base,
    async create(data) {
        if (!data.name || !data.name.trim()) throw ApiError.badRequest('Company name is required');
        // This installation's own license cap — separate from the per-tenant-plan
        // max_companies check in updateSubscription() below, which is a different concept
        // (a seat limit within one shared multi-tenant deployment, not the whole install).
        await licenseGuard.assertCanAddCompany();
        const company = await base.create(data);
        for (const lt of DEFAULT_LEAVE_TYPES) {
            await LeaveType.create({ ...lt, company_id: company.id });
        }
        return company;
    },
    async update(id, data) {
        if ('name' in data && !String(data.name).trim()) throw ApiError.badRequest('Company name is required');
        return base.update(id, data);
    },
    async updateSubscription(id, data) {
        const existing = await Company.findById(id);
        if (!existing) throw ApiError.notFound('Company not found');

        // Enforce max_companies when (re)assigning a plan: a plan with a seat limit
        // shouldn't silently accept more tenants than it's licensed for.
        const newPlanId = 'subscription_plan_id' in data ? data.subscription_plan_id : existing.subscription_plan_id;
        if (newPlanId && newPlanId !== existing.subscription_plan_id) {
            const plan = await db.get('SELECT name, max_companies FROM subscription_plans WHERE id = ?', [newPlanId]);
            if (plan && plan.max_companies !== null && plan.max_companies !== undefined) {
                const { count } = await db.get(
                    'SELECT COUNT(*) as count FROM companies WHERE subscription_plan_id = ?',
                    [newPlanId]
                );
                if (count >= plan.max_companies) {
                    throw ApiError.conflict(
                        `"${plan.name}" already has ${count} of its ${plan.max_companies} allowed companies assigned. Raise the plan's limit or move a company off it first.`
                    );
                }
            }
        }

        return Company.updateSubscription(id, data);
    },
};
