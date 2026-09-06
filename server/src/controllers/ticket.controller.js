const genericController = require('./genericController');
const ticketService = require('../services/ticket.service');

module.exports = {
    ...genericController(ticketService),
    updateStatus: async (req, res) => {
        res.json(await ticketService.updateStatus(req.params.id, req.body?.status));
    },
};
