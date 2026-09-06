const genericService = require('./genericService');
const UserDeduction = require('../models/UserDeduction.model');

module.exports = genericService(UserDeduction, 'User-defined deduction');
