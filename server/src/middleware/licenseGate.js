const licenseGuard = require('../services/licenseGuard.service');

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Applied to every /api/* route except /api/auth/login (mounted separately, before this).
// - unlicensed (no LICENSE_KEY set): pass through untouched — dev/local behavior unchanged.
// - active: pass through.
// - expired: GETs pass through (read-only), writes are blocked with a clear message.
// - suspended / revoked / not_found / unreachable: blocked entirely, including GETs — this
//   mirrors the existing per-tenant kill-switch's "Suspended" semantics, just applied to
//   the whole installation instead of one company within a shared deployment.
module.exports = function licenseGate(req, res, next) {
    const state = licenseGuard.currentState();

    if (state.state === 'unlicensed' || state.state === 'active') return next();

    if (state.state === 'expired') {
        if (WRITE_METHODS.includes(req.method)) {
            return res.status(403).json({
                error: state.message || 'Subscription expired — this installation is in read-only mode until renewed.',
                licenseState: 'expired',
            });
        }
        return next();
    }

    // suspended / revoked / not_found / unreachable — full lockout.
    return res.status(403).json({
        error: state.message || 'This installation is not licensed to run. Contact the vendor.',
        licenseState: state.state,
    });
};
