const genericRouter = require('./genericRouter');
const departmentController = require('../controllers/department.controller');

module.exports = genericRouter(departmentController);
