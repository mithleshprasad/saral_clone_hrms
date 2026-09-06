const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ROLES } = require('../constants');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        req.user = jwt.verify(token, env.jwt.secret);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Super Admin sits above the tenant-level roles (Admin/HR/Employee) and passes any
// requireRole check — it's the platform operator role for subscriptions/tenant control.
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || (!roles.includes(req.user.role) && req.user.role !== ROLES.SUPER_ADMIN)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };
