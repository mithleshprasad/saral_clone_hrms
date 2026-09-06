const genericRouter = require('./genericRouter');
const loanController = require('../controllers/loan.controller');

module.exports = genericRouter(loanController);
