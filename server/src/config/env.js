require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'saral_clone',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    },
    // Three separate frontends (web/ess/superadmin) call this one API from three origins.
    // CORS_ORIGIN accepts a comma-separated list; defaults cover all three dev ports.
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    // If SMTP_HOST is unset, mailer.service.js falls back to a JSON transport that logs
    // the email instead of sending it — lets notifications work end-to-end in dev/demo
    // environments with no real mail server, without silently pretending to send mail.
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'MpxHR <no-reply@mpxhr.local>',
    },
    // If SMS_API_URL is unset, sms.service.js logs to the sms_log table instead of sending
    // — same reasoning as SMTP above. Generic JSON-POST contract ({ to, message }, bearer
    // auth) since gateways vary; adapt the one call site in sms.service.js to a specific
    // provider's SDK/API shape when one is chosen.
    sms: {
        apiUrl: process.env.SMS_API_URL || '',
        apiKey: process.env.SMS_API_KEY || '',
        sender: process.env.SMS_SENDER || 'MpxHR',
    },
    // Independently-deployed-installation licensing (see services/licenseGuard.service.js).
    // Leave LICENSE_KEY unset for local/dev/unrestricted use — this is a separate concept
    // from the in-app "companies" multi-tenant subscription system (subscriptionGuard).
    license: {
        key: process.env.LICENSE_KEY || '',
        serverUrl: process.env.LICENSE_SERVER_URL || 'http://localhost:4001',
    },
};
