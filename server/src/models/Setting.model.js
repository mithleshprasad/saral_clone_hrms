const db = require('../config/db');

const Setting = {
    async findAll() {
        return db.all('SELECT * FROM settings');
    },

    async upsert(key, value) {
        await db.run(
            'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
            [key, value]
        );
    },
};

module.exports = Setting;
