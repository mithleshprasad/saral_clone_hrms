const genericController = require('./genericController');
const loanService = require('../services/loan.service');

module.exports = genericController(loanService);
