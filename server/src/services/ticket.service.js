const genericService = require('./genericService');
const Ticket = require('../models/Ticket.model');
const ApiError = require('../utils/ApiError');

const base = genericService(Ticket, 'Ticket');

module.exports = {
    ...base,
    async updateStatus(id, status) {
        if (!(await Ticket.findById(id))) throw ApiError.notFound('Ticket not found');
        return Ticket.setStatus(id, status);
    },
};
