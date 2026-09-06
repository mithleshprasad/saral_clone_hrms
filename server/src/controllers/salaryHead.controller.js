const genericController = require('./genericController');
const salaryHeadService = require('../services/salaryHead.service');

module.exports = genericController(salaryHeadService);
