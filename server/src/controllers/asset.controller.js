const genericController = require('./genericController');
const assetService = require('../services/asset.service');

module.exports = {
    ...genericController(assetService),
    assign: async (req, res) => {
        res.json(await assetService.assign(req.params.id, req.body?.employeeId));
    },
    returnAsset: async (req, res) => {
        res.json(await assetService.returnAsset(req.params.id));
    },
};
