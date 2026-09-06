const settingsService = require('../services/settings.service');

module.exports = {
    list: async (req, res) => {
        res.json(await settingsService.list());
    },
    update: async (req, res) => {
        res.json(await settingsService.update(req.body || {}));
    },
};
