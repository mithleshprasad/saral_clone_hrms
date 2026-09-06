const genericController = require('./genericController');
const branchService = require('../services/branch.service');

module.exports = genericController(branchService);
