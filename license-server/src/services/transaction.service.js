const Transaction = require('../models/Transaction.model');
const License = require('../models/License.model');
const ApiError = require('../utils/ApiError');

function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

module.exports = {
    async list() {
        return Transaction.findAll();
    },

    async listForLicense(licenseId) {
        const license = await License.findById(licenseId);
        if (!license) throw ApiError.notFound('License not found');
        return Transaction.findByLicense(licenseId);
    },

    // Recording a payment is the entire "mark as paid" workflow — the vendor confirms
    // money received in their own UPI app, then logs it here, which atomically extends
    // expires_at and reactivates the license (see License.extendAndActivate). There's no
    // separate approval step: this endpoint is vendor-only, so recording it *is* the
    // approval.
    async record(licenseId, { amount_inr, reference, extended_days, notes }) {
        const license = await License.findById(licenseId);
        if (!license) throw ApiError.notFound('License not found');

        const amount = Number(amount_inr);
        if (!amount || amount <= 0) throw ApiError.badRequest('amount_inr must be a positive number');

        const days = Number(extended_days) > 0 ? Number(extended_days) : 30;

        // Extend from whichever is later — today or the current expiry — so renewing
        // early doesn't shorten time already paid for, and renewing a lapsed license
        // starts the new period from today rather than backdating it.
        const today = new Date().toISOString().slice(0, 10);
        const base = license.expires_at > today ? license.expires_at : today;
        const newExpiresAt = addDays(base, days);

        await Transaction.create({
            license_id: licenseId, amount_inr: amount, reference, extended_days: days, notes,
            previous_expires_at: license.expires_at, new_expires_at: newExpiresAt,
        });

        return License.extendAndActivate(licenseId, newExpiresAt);
    },
};
