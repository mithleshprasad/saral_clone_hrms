const genericController = require('./genericController');
const employeeCategoryService = require('../services/employeeCategory.service');

module.exports = genericController(employeeCategoryService);
