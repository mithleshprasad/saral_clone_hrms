require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT || '4001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mpxhr_license_server',
        // Local MySQL needs none of this; a managed host (Aiven, PlanetScale, etc.) refuses
        // a plain connection outright. DB_SSL=true switches it on without touching local dev.
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-license-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    },
    // License Control now lives inside marketing/ (5178) instead of its own standalone
    // dev server (5177) — both are kept here since 5177 may still be running locally.
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5177,http://localhost:5178')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
};
