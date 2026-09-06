const Setting = require('../models/Setting.model');

module.exports = {
    async list() {
        return Setting.findAll();
    },

    async update(data) {
        for (const [key, value] of Object.entries(data)) {
            await Setting.upsert(key, value);
        }
        return { success: true };
    },
};
