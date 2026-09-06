const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const BLOCKED_STATUSES = ['Expired', 'Suspended'];

/**
 * The enforcement side of Application Control. Subscription plans/company status were
 * previously just data — nothing actually checked them outside payroll generation. This
 * is the shared guard other write paths (employee creation, ...) call into.
 */
module.exports = {
    /** Throws if the company doesn't exist, is disabled, or its subscription has lapsed. */
    async assertCompanyActive(companyId) {
        if (!companyId) return; // no company scoping requested — nothing to enforce
        const company = await db.get('SELECT id, is_active, subscription_status, subscription_plan_id, name FROM companies WHERE id = ?', [companyId]);
        if (!company) throw ApiError.notFound('Company not found');
        if (company.is_active === 0) {
            throw ApiError.forbidden(`"${company.name}" has been disabled by the platform administrator`);
        }
        if (BLOCKED_STATUSES.includes(company.subscription_status)) {
            throw ApiError.forbidden(`"${company.name}"'s subscription is ${company.subscription_status} — contact your administrator to reactivate it`);
        }
        return company;
    },

    /** Throws if adding one more employee would exceed the company's plan's max_employees. */
    async assertCanAddEmployee(companyId) {
        const company = await this.assertCompanyActive(companyId);
        if (!company || !companyId) return;

        const plan = company.subscription_plan_id
            ? await db.get('SELECT max_employees, name FROM subscription_plans WHERE id = ?', [company.subscription_plan_id])
            : null;
        if (!plan || plan.max_employees === null || plan.max_employees === undefined) return; // unlimited / no plan assigned

        const { count } = await db.get(
            "SELECT COUNT(*) as count FROM employees WHERE company_id = ? AND (status IS NULL OR status != 'Resigned')",
            [companyId]
        );
        if (count >= plan.max_employees) {
            throw ApiError.conflict(
                `Employee limit reached: the "${plan.name}" plan allows up to ${plan.max_employees} employees. Upgrade the plan or remove an employee first.`
            );
        }
    },
};
