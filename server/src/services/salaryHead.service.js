const genericService = require('./genericService');
const SalaryHead = require('../models/SalaryHead.model');

module.exports = genericService(SalaryHead, 'Salary head');
