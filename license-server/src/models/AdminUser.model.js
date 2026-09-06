const db = require('../config/db');

module.exports = {
    async findByUsername(username) {
        return db.get('SELECT * FROM admin_users WHERE username = ?', [username]);
    },
};
