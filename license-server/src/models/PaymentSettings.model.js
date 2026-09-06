const db = require('../config/db');

module.exports = {
    async get() {
        return db.get('SELECT * FROM payment_settings WHERE id = 1');
    },

    async upsert({ upi_id, payee_name }) {
        await db.run(
            `INSERT INTO payment_settings (id, upi_id, payee_name) VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE upi_id = VALUES(upi_id), payee_name = VALUES(payee_name)`,
            [upi_id ?? null, payee_name ?? null]
        );
        return this.get();
    },
};
