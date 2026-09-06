const genericRouter = require('./genericRouter');
const employeeCategoryController = require('../controllers/employeeCategory.controller');

module.exports = genericRouter(employeeCategoryController);
