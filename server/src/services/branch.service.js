const genericService = require('./genericService');
const Branch = require('../models/Branch.model');

module.exports = genericService(Branch, 'Branch');
