const genericService = require('./genericService');
const Loan = require('../models/Loan.model');

module.exports = genericService(Loan, 'Loan');
