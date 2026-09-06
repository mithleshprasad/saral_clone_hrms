const db = require('../config/db');

const SELECT_WITH_CLIENT = `
    SELECT t.*, l.client_name, l.license_key
    FROM transactions t JOIN licenses l ON l.id = t.license_id`;

module.exports = {
    async findAll() {
        return db.all(`${SELECT_WITH_CLIENT} ORDER BY t.created_at DESC`);
    },

    async findByLicense(licenseId) {
        return db.all(`${SELECT_WITH_CLIENT} WHERE t.license_id = ? ORDER BY t.created_at DESC`, [licenseId]);
    },

    async create({ license_id, amount_inr, reference, extended_days, notes, previous_expires_at, new_expires_at }) {
        const { insertId } = await db.run(
            `INSERT INTO transactions (license_id, amount_inr, reference, extended_days, notes, previous_expires_at, new_expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [license_id, amount_inr, reference ?? null, extended_days, notes ?? null, previous_expires_at, new_expires_at]
        );
        return db.get(`${SELECT_WITH_CLIENT} WHERE t.id = ?`, [insertId]);
    },
};
