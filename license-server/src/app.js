const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { requireVendor } = require('./middleware/auth');
const asyncHandler = require('./utils/asyncHandler');

const authRoutes = require('./routes/auth.routes');
const licensePlansRoutes = require('./routes/licensePlans.routes');
const licensesRoutes = require('./routes/licenses.routes');
const paymentSettingsRoutes = require('./routes/paymentSettings.routes');
const licenseController = require('./controllers/license.controller');
const transactionController = require('./controllers/transaction.controller');
const paymentSettingsController = require('./controllers/paymentSettings.controller');

const app = express();

// Vite dev servers silently auto-increment to the next free port whenever a stray
// previous instance is still holding the expected one (a recurring annoyance locally —
// marketing/ has landed on 5178, 5179, 5180... across restarts this session), and each
// one is a real, different-origin request that a fixed allowlist quietly rejects with no
// visible error beyond a failed network call. In development, trust any localhost/127.0.0.1
// origin instead of chasing the allowlist every time a port shifts; production keeps the
// real allowlist from CORS_ORIGIN.
const corsOptions = env.nodeEnv === 'production'
    ? { origin: env.corsOrigins }
    : { origin: /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/ };
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/license-plans', requireVendor, licensePlansRoutes);
app.use('/api/licenses', requireVendor, licensesRoutes);

// Public — the signup confirmation screen needs the UPI ID to render a QR for a paid-plan
// signup, before that visitor is anyone the vendor auth system knows about. Read-only:
// changing payment settings still goes through the vendor-only router below. Registered
// before that router so this exact path isn't swallowed by requireVendor first.
app.get('/api/payment-settings/public', asyncHandler(paymentSettingsController.get));
app.use('/api/payment-settings', requireVendor, paymentSettingsRoutes);
app.get('/api/transactions', requireVendor, asyncHandler(transactionController.listAll));

// Public — the one endpoint every deployed client server/ instance calls to check in.
// No vendor auth: a client installation authenticates with its own license key instead.
app.post('/api/validate', asyncHandler(licenseController.validate));

// Public — the marketing site's self-serve signup form. No vendor auth: this is exactly
// how a prospect who isn't a vendor user creates their first license.
app.post('/api/signup', asyncHandler(licenseController.signup));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const MYSQL_ERROR_MESSAGES = {
    ER_BAD_NULL_ERROR: (err) => {
        const col = err.sqlMessage?.match(/Column '(\w+)'/)?.[1];
        return { status: 400, message: col ? `${col} is required` : 'A required field is missing' };
    },
    ER_DUP_ENTRY: () => ({ status: 409, message: 'A record with these values already exists' }),
    ER_NO_REFERENCED_ROW_2: () => ({ status: 400, message: 'A referenced record does not exist' }),
    ER_NO_REFERENCED_ROW: () => ({ status: 400, message: 'A referenced record does not exist' }),
    ER_ROW_IS_REFERENCED_2: () => ({ status: 409, message: 'This record is still referenced by other data and cannot be deleted' }),
    ER_ROW_IS_REFERENCED: () => ({ status: 409, message: 'This record is still referenced by other data and cannot be deleted' }),
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    const mapped = MYSQL_ERROR_MESSAGES[err.code]?.(err);
    if (mapped) return res.status(mapped.status).json({ error: mapped.message });
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
