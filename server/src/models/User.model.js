const db = require('../config/db');

const User = {
    async findByUsername(username) {
        return db.get('SELECT * FROM users WHERE username = ?', [username]);
    },

    async findByEmployeeId(employeeId) {
        return db.get('SELECT username FROM users WHERE employee_id = ?', [employeeId]);
    },

    async create({ username, passwordHash, role, employeeId }) {
        const { insertId } = await db.run(
            'INSERT INTO users (username, password, role, employee_id) VALUES (?, ?, ?, ?)',
            [username, passwordHash, role, employeeId || null]
        );
        return db.get('SELECT id, username, role, employee_id FROM users WHERE id = ?', [insertId]);
    },
};

module.exports = User;
