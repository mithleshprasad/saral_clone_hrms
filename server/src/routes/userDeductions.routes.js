const genericRouter = require('./genericRouter');
const userDeductionController = require('../controllers/userDeduction.controller');

module.exports = genericRouter(userDeductionController);
