const genericRouter = require('./genericRouter');
const branchController = require('../controllers/branch.controller');

module.exports = genericRouter(branchController);
