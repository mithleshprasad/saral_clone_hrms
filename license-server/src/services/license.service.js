const License = require('../models/License.model');
const LicensePlan = require('../models/LicensePlan.model');
const ApiError = require('../utils/ApiError');
const { generateLicenseKey } = require('../utils/licenseKey');

function addYears(dateStr, years) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d.toISOString().slice(0, 10);
}

module.exports = {
    async list() {
        return License.findAll();
    },

    async create({ client_name, contact_email, plan_id, issued_at, expires_at, notes }) {
        if (!client_name) throw ApiError.badRequest('client_name is required');
        if (!plan_id) throw ApiError.badRequest('plan_id is required');
        if (!expires_at) throw ApiError.badRequest('expires_at is required');
        const plan = await LicensePlan.findById(plan_id);
        if (!plan) throw ApiError.badRequest('No such plan');

        let key;
        // Astronomically unlikely to collide, but a unique constraint backs this up either way.
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateLicenseKey();
            const existing = await License.findByKey(candidate);
            if (!existing) { key = candidate; break; }
        }
        if (!key) throw ApiError.conflict('Could not generate a unique license key, try again');

        return License.create({
            client_name, contact_email, license_key: key, plan_id,
            issued_at: issued_at || new Date().toISOString().slice(0, 10),
            expires_at, notes,
        });
    },

    // Public — no vendor auth. The self-serve signup form on the marketing site calls this
    // directly. A free plan activates immediately (nothing to verify). A paid plan is
    // created Suspended — a full lockout, same as any other Suspended license — until the
    // vendor sees the payment land and runs Record Payment, which both reactivates it and
    // sets a real expiry in one step (see transaction.service.js). expires_at here is just
    // a placeholder so the row satisfies the schema; Record Payment overwrites it for real.
    async signup({ client_name, contact_email, contact_phone, plan_name }) {
        if (!client_name) throw ApiError.badRequest('client_name is required');
        if (!contact_email) throw ApiError.badRequest('contact_email is required');
        if (!plan_name) throw ApiError.badRequest('plan_name is required');

        const plan = await LicensePlan.findByName(plan_name);
        if (!plan) throw ApiError.badRequest('No such plan');
        if (plan.monthly_price_inr === null) {
            throw ApiError.badRequest('This plan is not self-serve — contact the vendor directly');
        }

        const isFree = Number(plan.monthly_price_inr) === 0;
        const today = new Date().toISOString().slice(0, 10);
        const notes = contact_phone
            ? `Signed up via website. Phone: ${contact_phone}`
            : 'Signed up via website.';

        const license = await this.create({
            client_name, contact_email, plan_id: plan.id,
            issued_at: today,
            // "Free forever" has no real expiry concept in a DATE NOT NULL column — push it
            // a century out rather than invent a nullable-expiry code path for one plan.
            expires_at: isFree ? addYears(today, 100) : today,
            notes,
        });

        if (!isFree) await this.setStatus(license.id, 'Suspended');

        return {
            licenseKey: license.license_key,
            status: isFree ? 'active' : 'pending_payment',
            plan: { name: plan.name, monthlyPriceInr: plan.monthly_price_inr },
        };
    },

    async update(id, data) {
        const existing = await License.findById(id);
        if (!existing) throw ApiError.notFound('License not found');
        if (!data.client_name) throw ApiError.badRequest('client_name is required');
        if (!data.plan_id) throw ApiError.badRequest('plan_id is required');
        if (!data.expires_at) throw ApiError.badRequest('expires_at is required');
        return License.update(id, data);
    },

    async setStatus(id, status) {
        const existing = await License.findById(id);
        if (!existing) throw ApiError.notFound('License not found');
        if (!['Active', 'Suspended', 'Revoked'].includes(status)) throw ApiError.badRequest('Invalid status');
        return License.setStatus(id, status);
    },

    async remove(id) {
        const existing = await License.findById(id);
        if (!existing) throw ApiError.notFound('License not found');
        return License.remove(id);
    },

    // The public check-in contract every deployed client server/ instance calls, on
    // startup and periodically thereafter. Always resolves (never throws for a bad/unknown
    // key) — an unattended background check-in shouldn't need exception handling to read
    // a plain "this key isn't valid" result the same way a 404 would require.
    async validate(licenseKey, ip) {
        if (!licenseKey) {
            return { valid: false, state: 'not_found', message: 'No license key provided' };
        }
        const license = await License.findByKey(licenseKey);
        if (!license) {
            return { valid: false, state: 'not_found', message: 'No license found for this key' };
        }

        await License.recordCheckin(license.id, ip);

        const today = new Date().toISOString().slice(0, 10);
        const isPastExpiry = license.expires_at < today;

        if (license.status === 'Revoked') {
            return { valid: false, state: 'revoked', message: 'This license has been revoked. Contact the vendor.' };
        }
        if (license.status === 'Suspended') {
            return { valid: false, state: 'suspended', message: 'This license has been suspended. Contact the vendor.' };
        }
        if (isPastExpiry) {
            return {
                valid: true, state: 'expired',
                message: 'Subscription expired — the application is running in read-only mode until renewed.',
                clientName: license.client_name, expiresAt: license.expires_at,
                plan: { name: license.plan_name, maxCompanies: license.max_companies, maxEmployees: license.max_employees, features: license.features },
            };
        }
        return {
            valid: true, state: 'active',
            clientName: license.client_name, expiresAt: license.expires_at,
            plan: { name: license.plan_name, maxCompanies: license.max_companies, maxEmployees: license.max_employees, features: license.features },
        };
    },
};
