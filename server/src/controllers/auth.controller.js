const authService = require('../services/auth.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    login: async (req, res) => {
        const { username, password } = req.body || {};
        res.json(await authService.login(username, password));
    },
    me: (req, res) => {
        res.json({ user: req.user });
    },
    createUser: async (req, res) => {
        const user = await authService.createUser(req.body || {});
        auditLog.record({
            userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'User', entityId: user.id,
            summary: `Created login "${user.username}" (role: ${user.role}${user.employee_id ? `, linked to employee #${user.employee_id}` : ''})`,
        });
        res.status(201).json(user);
    },
    checkUserExists: async (req, res) => {
        res.json(await authService.checkUserExists(req.params.employeeId));
    },
};
