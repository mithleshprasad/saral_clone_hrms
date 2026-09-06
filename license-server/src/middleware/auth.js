const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Gates every route except /api/auth/login and /api/validate (the public check-in
// endpoint client installations call). Only the vendor themselves reaches license/plan
// management.
function requireVendor(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        req.vendor = jwt.verify(token, env.jwt.secret);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { requireVendor };
