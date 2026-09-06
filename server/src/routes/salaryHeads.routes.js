const genericRouter = require('./genericRouter');
const salaryHeadController = require('../controllers/salaryHead.controller');

module.exports = genericRouter(salaryHeadController);
