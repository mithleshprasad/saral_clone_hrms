const genericService = require('./genericService');
const EmployeeCategory = require('../models/EmployeeCategory.model');

module.exports = genericService(EmployeeCategory, 'Employee category');
