const reportWriterService = require('../services/reportWriter.service');

module.exports = {
    columns: (req, res) => {
        res.json(reportWriterService.listColumns());
    },
    run: async (req, res) => {
        res.json(await reportWriterService.run(req.body || {}));
    },
};
