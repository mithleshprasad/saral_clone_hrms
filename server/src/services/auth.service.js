const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { hashPassword, verifyPassword } = require('../utils/password');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { ROLES } = require('../constants');

module.exports = {
    async login(username, password) {
        if (!username || !password) throw ApiError.badRequest('username and password are required');

        const user = await User.findByUsername(username);
        if (!user || !verifyPassword(password, user.password)) {
            throw ApiError.unauthorized('Invalid username or password');
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, employeeId: user.employee_id },
            env.jwt.secret,
            { expiresIn: env.jwt.expiresIn }
        );

        return {
            token,
            user: { id: user.id, username: user.username, role: user.role, employeeId: user.employee_id },
        };
    },

    async createUser({ username, password, employee_id, role }) {
        const existing = await User.findByUsername(username);
        if (existing) throw ApiError.conflict('Username already taken');
        return User.create({ username, passwordHash: hashPassword(password), role: role || ROLES.EMPLOYEE, employeeId: employee_id });
    },

    async checkUserExists(employeeId) {
        return User.findByEmployeeId(employeeId);
    },
};
