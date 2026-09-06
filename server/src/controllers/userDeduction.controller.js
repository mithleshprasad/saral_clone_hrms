const genericController = require('./genericController');
const userDeductionService = require('../services/userDeduction.service');

module.exports = genericController(userDeductionService);
