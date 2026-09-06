const authService = require('../services/auth.service');

module.exports = {
    login: async (req, res) => {
        const { username, password } = req.body || {};
        res.json(await authService.login(username, password));
    },
};
