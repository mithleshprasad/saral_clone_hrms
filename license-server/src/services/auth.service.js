const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser.model');
const { verifyPassword } = require('../utils/password');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

module.exports = {
    async login(username, password) {
        if (!username || !password) throw ApiError.badRequest('username and password are required');
        const admin = await AdminUser.findByUsername(username);
        if (!admin || !verifyPassword(password, admin.password)) {
            throw ApiError.unauthorized('Invalid username or password');
        }
        const token = jwt.sign({ id: admin.id, username: admin.username }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
        return { token, admin: { id: admin.id, username: admin.username } };
    },
};
