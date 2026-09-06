const db = require('../config/db');
const genericModel = require('./genericModel');

// Subscription/application-control columns are deliberately excluded from the writable
// `fields` list below — they must only be changed through updateSubscription(), which is
// wired to a Super-Admin-only route, not through the general company edit form any tenant
// Admin can reach.
const base = genericModel(
    'companies',
    [
        'name', 'code', 'phone', 'phone2', 'email', 'website', 'address', 'address2', 'address3', 'city', 'state', 'pincode',
        'business_type', 'est_date', 'logo', 'pan', 'tan', 'gstin', 'cin',
        'pf_code', 'pf_est_code', 'pf_ext', 'pf_signatory', 'pf_local_office',
        'esi_code', 'esi_local_office', 'esi_signatory',
        'pt_rc_no', 'pt_ec_no', 'tax_circle', 'tax_cit', 'lwf_reg_no',
        'bank_name', 'bank_branch', 'bank_account', 'bank_ifsc', 'bank_micr', 'bank_cheque_label',
        'signatory_name', 'signatory_designation', 'signatory_father',
        'director1_name', 'director1_designation', 'director1_father',
        'director2_name', 'director2_designation', 'director2_father',
    ],
    { orderBy: 'name' }
);

const SUBSCRIPTION_FIELDS = ['subscription_plan_id', 'subscription_status', 'trial_ends_at', 'subscription_starts_at', 'subscription_ends_at', 'is_active'];

module.exports = {
    ...base,

    async updateSubscription(id, data) {
        const updates = SUBSCRIPTION_FIELDS.filter((f) => f in data);
        if (updates.length === 0) return base.findById(id);
        await db.run(
            `UPDATE companies SET ${updates.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
            [...updates.map((f) => data[f]), id]
        );
        return base.findById(id);
    },
};
