const genericController = require('./genericController');
const departmentService = require('../services/department.service');

module.exports = genericController(departmentService);
