const env = require('../config/env');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

// Enforcement for independently-deployed installations (as opposed to subscriptionGuard,
// which enforces per-tenant plans *within* one shared deployment). If this installation
// has no LICENSE_KEY configured, licensing is skipped entirely — local/dev environments
// and installations not yet wired up to the license server run unrestricted, the same way
// SMTP/SMS fall back to a no-op instead of blocking when unconfigured.
//
// The last-known-good check-in result is cached in memory. A license server that's
// briefly unreachable (network blip, restart) must never lock out a paying client — GRACE_MS
// is how long a stale-but-once-valid result keeps being honored before licensing fails
// closed. A license server that actively responds "suspended"/"revoked"/"expired" always
// wins immediately; only *unreachability* gets the grace period.
const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cached = null; // { state, valid, plan, expiresAt, checkedAt }
let lastGoodAt = null;

function isConfigured() {
    return !!env.license?.key;
}

async function checkIn() {
    if (!isConfigured()) return null;
    try {
        const res = await fetch(`${env.license.serverUrl}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey: env.license.key }),
            signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();
        cached = { ...data, checkedAt: Date.now() };
        if (data.valid) lastGoodAt = Date.now();
        return cached;
    } catch (err) {
        console.error('[licenseGuard] Could not reach license server:', err.message);
        return cached; // keep whatever we had — grace period logic decides if it still counts
    }
}

function currentState() {
    if (!isConfigured()) return { valid: true, state: 'unlicensed', plan: null };
    if (!cached) return { valid: false, state: 'not_found', message: 'License not yet verified — waiting for first check-in' };

    const stale = Date.now() - cached.checkedAt > RECHECK_INTERVAL_MS;
    const withinGrace = lastGoodAt && Date.now() - lastGoodAt < GRACE_MS;
    if (stale && cached.valid && withinGrace) {
        // Couldn't refresh, but the last real answer was "valid" and we're still inside
        // the grace window — keep honoring it rather than failing closed on a network blip.
        return cached;
    }
    if (stale && !withinGrace) {
        return { valid: false, state: 'unreachable', message: 'License server unreachable for too long — contact the vendor.' };
    }
    return cached;
}

module.exports = {
    isConfigured,
    checkIn,
    currentState,

    startPeriodicCheckIn() {
        if (!isConfigured()) {
            console.log('[licenseGuard] No LICENSE_KEY configured — running unlicensed/unrestricted.');
            return;
        }
        checkIn().then((r) => console.log('[licenseGuard] Initial check-in:', r?.state));
        setInterval(checkIn, RECHECK_INTERVAL_MS);
    },

    /** Throws if this installation is already at its licensed company cap. */
    async assertCanAddCompany() {
        const state = currentState();
        if (!state.valid || !state.plan) return; // unlicensed, or a blocked state the gate middleware already caught
        const max = state.plan.maxCompanies;
        if (max === null || max === undefined) return;
        const { count } = await db.get('SELECT COUNT(*) as count FROM companies');
        if (count >= max) {
            throw ApiError.conflict(
                `This installation's license ("${state.plan.name}") allows up to ${max} compan${max === 1 ? 'y' : 'ies'}. Contact the vendor to upgrade.`
            );
        }
    },

    /** Throws if this installation is already at its licensed total-employee cap. */
    async assertCanAddEmployee() {
        const state = currentState();
        if (!state.valid || !state.plan) return; // unlicensed, or a blocked state the gate middleware already caught
        const max = state.plan.maxEmployees;
        if (max === null || max === undefined) return;
        const { count } = await db.get("SELECT COUNT(*) as count FROM employees WHERE status IS NULL OR status != 'Resigned'");
        if (count >= max) {
            throw ApiError.conflict(
                `This installation's license ("${state.plan.name}") allows up to ${max} employees across all companies. Contact the vendor to upgrade.`
            );
        }
    },

    /** Throws if the current license's plan doesn't include the given feature key. */
    assertFeatureEnabled(featureKey) {
        const state = currentState();
        if (!state.valid || !state.plan) return; // unlicensed, or already blocked upstream
        if (!state.plan.features.includes(featureKey)) {
            throw ApiError.forbidden(`This installation's license ("${state.plan.name}") does not include "${featureKey}". Contact the vendor to upgrade.`);
        }
    },
};
